import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import sharp from "sharp";
import JSZip from "jszip";

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per photo
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "AutoFrame Studio Pro API" });
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
