import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import sharp from "sharp";
import JSZip from "jszip";

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per photo for DSLR RAW files
});

function extractEmbeddedJpegFromBuffer(buffer: Buffer): Buffer | null {
  if (!buffer || buffer.length < 100) return null;

  // 1. Check TIFF IFD structure (Canon CR2, Nikon NEF, Sony ARW, DNG, Pentax PEF, Olympus ORF, Panasonic RW2)
  const isLE = buffer[0] === 0x49 && buffer[1] === 0x49; // 'II'
  const isBE = buffer[0] === 0x4d && buffer[1] === 0x4d; // 'MM'
  if (isLE || isBE) {
    try {
      const readU16 = (o: number) => (isLE ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o));
      const readU32 = (o: number) => (isLE ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o));

      const ifd0Offset = readU32(4);
      if (ifd0Offset > 0 && ifd0Offset < buffer.length - 2) {
        const visited = new Set<number>();
        const ifdQueue: number[] = [ifd0Offset];
        const candidates: { offset: number; length: number; area: number }[] = [];

        while (ifdQueue.length > 0) {
          const curOffset = ifdQueue.shift()!;
          if (!curOffset || curOffset >= buffer.length - 2 || visited.has(curOffset)) continue;
          visited.add(curOffset);

          const numEntries = readU16(curOffset);
          let entryOffset = curOffset + 2;

          let jpegOffset = 0;
          let jpegLength = 0;
          let stripOffset = 0;
          let stripByteCount = 0;
          let width = 0;
          let height = 0;

          for (let i = 0; i < numEntries; i++) {
            if (entryOffset + 12 > buffer.length) break;
            const tag = readU16(entryOffset);
            const type = readU16(entryOffset + 2);
            const count = readU32(entryOffset + 4);
            let value = readU32(entryOffset + 8);
            if (type === 3) value = readU16(entryOffset + 8);

            if (tag === 0x0100) width = value;
            else if (tag === 0x0101) height = value;
            else if (tag === 0x0201) jpegOffset = value;
            else if (tag === 0x0202) jpegLength = value;
            else if (tag === 0x0111) stripOffset = value;
            else if (tag === 0x0117) stripByteCount = value;
            else if (tag === 0x014a) {
              if (count === 1) ifdQueue.push(value);
              else {
                for (let s = 0; s < Math.min(count, 10); s++) {
                  const subPtr = value + s * 4;
                  if (subPtr + 4 <= buffer.length) ifdQueue.push(readU32(subPtr));
                }
              }
            } else if (tag === 0x8769) {
              ifdQueue.push(value);
            }

            entryOffset += 12;
          }

          if (jpegOffset > 0 && jpegLength > 500 && jpegOffset + jpegLength <= buffer.length) {
            if (buffer[jpegOffset] === 0xff && buffer[jpegOffset + 1] === 0xd8) {
              candidates.push({ offset: jpegOffset, length: jpegLength, area: width * height || jpegLength });
            }
          }
          if (stripOffset > 0 && stripByteCount > 500 && stripOffset + stripByteCount <= buffer.length) {
            if (buffer[stripOffset] === 0xff && buffer[stripOffset + 1] === 0xd8) {
              candidates.push({ offset: stripOffset, length: stripByteCount, area: width * height || stripByteCount });
            }
          }

          if (entryOffset + 4 <= buffer.length) {
            const nextIfd = readU32(entryOffset);
            if (nextIfd > 0 && !visited.has(nextIfd)) ifdQueue.push(nextIfd);
          }
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => b.area - a.area);
          const best = candidates[0];
          return buffer.subarray(best.offset, best.offset + best.length);
        }
      }
    } catch (e) {
      console.warn("TIFF IFD extraction failed, falling back to stream scan:", e);
    }
  }

  // 2. Check Fujifilm RAF header
  if (buffer.length >= 96 && buffer.subarray(0, 16).toString("ascii") === "FUJIFILMCCD-RAW ") {
    const jpegOffset = buffer.readUInt32BE(84);
    const jpegLength = buffer.readUInt32BE(88);
    if (
      jpegOffset > 0 &&
      jpegLength > 500 &&
      jpegOffset + jpegLength <= buffer.length &&
      buffer[jpegOffset] === 0xff &&
      buffer[jpegOffset + 1] === 0xd8
    ) {
      return buffer.subarray(jpegOffset, jpegOffset + jpegLength);
    }
  }

  // 3. Universal JPEG Stream Scanner
  const len = buffer.length;
  const candidates: { start: number; end: number; size: number; area: number }[] = [];
  let i = 0;

  while (i < len - 3) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8 && buffer[i + 2] === 0xff) {
      const start = i;
      let pos = i + 2;
      let foundEoi = false;
      let width = 0;
      let height = 0;

      while (pos < len - 1) {
        if (buffer[pos] !== 0xff) {
          pos++;
          continue;
        }

        const marker = buffer[pos + 1];
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
          pos += 2;
          continue;
        }

        if (marker === 0xd9) {
          foundEoi = true;
          pos += 2;
          break;
        }

        if (marker === 0xda) {
          pos += 2;
          if (pos + 2 <= len) {
            const sosLen = (buffer[pos] << 8) | buffer[pos + 1];
            pos += sosLen;
          }
          while (pos < len - 1) {
            if (buffer[pos] === 0xff) {
              const m2 = buffer[pos + 1];
              if (m2 === 0xd9) {
                foundEoi = true;
                pos += 2;
                break;
              } else if (m2 === 0x00 || (m2 >= 0xd0 && m2 <= 0xd7)) {
                pos += 2;
              } else {
                pos++;
              }
            } else {
              pos++;
            }
          }
          break;
        }

        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          if (pos + 9 <= len) {
            height = (buffer[pos + 5] << 8) | buffer[pos + 6];
            width = (buffer[pos + 7] << 8) | buffer[pos + 8];
          }
        }

        if (pos + 3 <= len) {
          const segLen = (buffer[pos + 2] << 8) | buffer[pos + 3];
          if (segLen >= 2) pos += 2 + segLen;
          else pos += 2;
        } else {
          pos += 2;
        }
      }

      if (foundEoi && pos > start) {
        const sliceLen = pos - start;
        candidates.push({
          start,
          end: pos,
          size: sliceLen,
          area: width * height || sliceLen,
        });
        i = pos - 1;
      }
    }
    i++;
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.area - a.area);
    const best = candidates[0];
    return buffer.subarray(best.start, best.end);
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "AutoFrame Studio Pro API" });
  });

  // API: Convert HEIC / HEIF image to JPEG using Sharp (Native libheif)
  app.post("/api/convert-heic", upload.single("file"), async (req: any, res: any) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No HEIC file provided" });
        return;
      }
      const jpegBuffer = await sharp(file.buffer)
        .rotate() // Auto-orient via EXIF tags from iPhone
        .jpeg({ quality: 94 })
        .toBuffer();

      res.setHeader("Content-Type", "image/jpeg");
      res.send(jpegBuffer);
    } catch (err: any) {
      console.error("HEIC conversion error:", err);
      res.status(500).json({ error: err.message || "Failed to convert HEIC" });
    }
  });

  // API: Convert Camera RAW photo to high-res JPEG
  app.post("/api/convert-raw", upload.single("file"), async (req: any, res: any) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No RAW file provided" });
        return;
      }

      // Try extracting embedded high-res JPEG first
      const previewBuffer = extractEmbeddedJpegFromBuffer(file.buffer);

      if (previewBuffer && previewBuffer.length > 500) {
        // Auto-orient via EXIF orientation if available and optimize
        const processedJpeg = await sharp(previewBuffer)
          .rotate()
          .jpeg({ quality: 94 })
          .toBuffer();

        res.setHeader("Content-Type", "image/jpeg");
        res.send(processedJpeg);
        return;
      }

      // Direct Sharp decoding attempt (e.g. for DNG/TIFF-based RAW)
      try {
        const directJpeg = await sharp(file.buffer)
          .rotate()
          .jpeg({ quality: 94 })
          .toBuffer();

        res.setHeader("Content-Type", "image/jpeg");
        res.send(directJpeg);
        return;
      } catch (sharpDirectErr) {
        console.warn("Direct Sharp decode also failed for RAW:", sharpDirectErr);
      }

      res.status(422).json({
        error: "Unable to find a valid embedded preview JPEG inside this RAW file.",
      });
    } catch (err: any) {
      console.error("RAW conversion error:", err);
      res.status(500).json({ error: err.message || "Failed to convert RAW image" });
    }
  });

  // API: Hole Auto-Detection from PNG Buffer or Base64
  app.post("/api/detect-hole", async (req, res) => {
    try {
      const { imageBase64, alphaThreshold = 30 } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "Missing imageBase64 string" });
        return;
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(cleanBase64, "base64");

      // Extract raw RGBA metadata and raw pixel buffer
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const width = info.width;
      const height = info.height;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      let transparentPixelCount = 0;

      // Scan alpha channel (every 4th byte is Alpha)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alphaIndex = (y * width + x) * 4 + 3;
          const alpha = data[alphaIndex];

          if (alpha < alphaThreshold) {
            transparentPixelCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (transparentPixelCount === 0 || maxX < minX || maxY < minY) {
        // Fallback to centered default hole (e.g. 80% inner box) if no clear transparency found
        const holeX = Math.round(width * 0.1);
        const holeY = Math.round(height * 0.1);
        const holeW = Math.round(width * 0.8);
        const holeH = Math.round(height * 0.8);

        res.json({
          detected: false,
          hole: { x: holeX, y: holeY, width: holeW, height: holeH },
          message: "No distinct transparent window found. Created centered cutout fallback.",
          dimensions: { width, height },
        });
        return;
      }

      const holeWidth = maxX - minX + 1;
      const holeHeight = maxY - minY + 1;

      res.json({
        detected: true,
        hole: {
          x: minX,
          y: minY,
          width: holeWidth,
          height: holeHeight,
        },
        dimensions: { width, height },
        transparentPixels: transparentPixelCount,
      });
    } catch (err: any) {
      console.error("Hole detection error:", err);
      res.status(500).json({ error: err.message || "Failed to detect hole" });
    }
  });

  // API: Server Batch Process Endpoint using Sharp (Processes uploaded files or base64 items)
  app.post("/api/process-batch", upload.fields([
    { name: "template", maxCount: 1 },
    { name: "photos", maxCount: 150 }
  ]), async (req: any, res: any) => {
    try {
      const templateFile = req.files?.template?.[0];
      const photoFiles = req.files?.photos || [];
      const settingsRaw = req.body.settings ? JSON.parse(req.body.settings) : {};

      if (!templateFile) {
        return res.status(400).json({ error: "Missing frame template PNG" });
      }

      if (photoFiles.length === 0) {
        return res.status(400).json({ error: "No photos provided in batch" });
      }

      const {
        hole = { x: 50, y: 50, width: 400, height: 400 },
        exposure = 0,
        contrast = 0,
        saturation = 0,
        sharpness = 0,
        temperature = 0,
      } = settingsRaw;

      const templateMeta = await sharp(templateFile.buffer).metadata();
      const frameW = templateMeta.width || 800;
      const frameH = templateMeta.height || 800;

      const zip = new JSZip();
      const zipFolder = zip.folder("framed_photos");

      // Process photos sequentially or in small concurrency chunks with Sharp
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];

        // 1. Process base photo
        let photoSharp = sharp(file.buffer);

        // Adjustments: Modulate brightness, saturation
        const brightnessFactor = 1 + (exposure / 100) * 0.5;
        const saturationFactor = 1 + (saturation / 100) * 0.8;

        photoSharp = photoSharp.modulate({
          brightness: Math.max(0.2, brightnessFactor),
          saturation: Math.max(0, saturationFactor),
        });

        // Contrast adjustment via linear tint/level or sharpen
        if (sharpness > 0) {
          const sigma = 0.5 + (sharpness / 100) * 2;
          photoSharp = photoSharp.sharpen({ sigma });
        }

        // Fit photo inside cutout window precisely using LANCZOS cover
        const croppedPhotoBuffer = await photoSharp
          .resize(Math.round(hole.width), Math.round(hole.height), {
            fit: "cover",
            position: "center",
            kernel: "lanczos3",
          })
          .toBuffer();

        // 2. Create blank composite canvas matching Frame dimensions
        // Layer 1: Cropped Photo placed at (hole.x, hole.y)
        // Layer 2: Frame Template overlay placed at (0, 0)
        const compositeBuffer = await sharp({
          create: {
            width: frameW,
            height: frameH,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([
            {
              input: croppedPhotoBuffer,
              left: Math.round(hole.x),
              top: Math.round(hole.y),
            },
            {
              input: templateFile.buffer,
              left: 0,
              top: 0,
            },
          ])
          .png()
          .toBuffer();

        const fileName = `framed_${i + 1}_${file.originalname.replace(/\.[^/.]+$/, "")}.png`;
        zipFolder?.file(fileName, compositeBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="framed_photos.zip"');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error("Batch processing error:", err);
      res.status(500).json({ error: err.message || "Failed to process batch" });
    }
  });

  // Vite middleware for dev or Static production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AutoFrame Studio Pro running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
