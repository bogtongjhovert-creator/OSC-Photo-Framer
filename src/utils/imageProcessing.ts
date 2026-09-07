import JSZip from 'jszip';
import { EditSettings, HoleBoundingBox, UserPhoto } from '../types';

/**
 * Automatically detects the bounding box (x, y, width, height) of the cutout
 * window in a frame image.
 * 
 * Supports:
 * 1. Enclosed transparent inner windows (distinguishing inner photo cutout from outer transparent margins/corners).
 * 2. Overlay / banner frames with open transparent background.
 * 3. Opaque frames with solid white or chroma-key cutouts (JPG or non-transparent PNGs).
 */
export async function detectTransparentHole(
  imageDataUrl: string,
  alphaThreshold: number = 35
): Promise<{
  hole: HoleBoundingBox;
  canvasWidth: number;
  canvasHeight: number;
  detected: boolean;
  hasSolidCutout?: boolean;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      if (!w || !h) {
        resolve({
          hole: { x: 100, y: 100, width: 1000, height: 700 },
          canvasWidth: 1200,
          canvasHeight: 900,
          detected: false,
        });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const totalPixels = w * h;
      const isTrans = new Uint8Array(totalPixels);
      let transparentCount = 0;

      for (let i = 0; i < totalPixels; i++) {
        const a = data[i * 4 + 3];
        if (a < alphaThreshold) {
          isTrans[i] = 1;
          transparentCount++;
        }
      }

      // Case 1: Frame has transparent pixels
      if (transparentCount > 100) {
        // Run boundary flood-fill to identify outer transparent pixels (margins, rounded frame corners)
        const isBorderTrans = new Uint8Array(totalPixels);
        const queue: number[] = [];

        // Top and bottom borders
        for (let x = 0; x < w; x++) {
          const topIdx = x;
          if (isTrans[topIdx]) {
            isBorderTrans[topIdx] = 1;
            queue.push(topIdx);
          }
          const btmIdx = (h - 1) * w + x;
          if (isTrans[btmIdx] && !isBorderTrans[btmIdx]) {
            isBorderTrans[btmIdx] = 1;
            queue.push(btmIdx);
          }
        }

        // Left and right borders
        for (let y = 0; y < h; y++) {
          const leftIdx = y * w;
          if (isTrans[leftIdx] && !isBorderTrans[leftIdx]) {
            isBorderTrans[leftIdx] = 1;
            queue.push(leftIdx);
          }
          const rightIdx = y * w + (w - 1);
          if (isTrans[rightIdx] && !isBorderTrans[rightIdx]) {
            isBorderTrans[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // BFS flood fill from border transparent pixels
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cy = Math.floor(curr / w);
          const cx = curr % w;

          // 4-neighborhood
          if (cx > 0) {
            const left = curr - 1;
            if (isTrans[left] && !isBorderTrans[left]) {
              isBorderTrans[left] = 1;
              queue.push(left);
            }
          }
          if (cx < w - 1) {
            const right = curr + 1;
            if (isTrans[right] && !isBorderTrans[right]) {
              isBorderTrans[right] = 1;
              queue.push(right);
            }
          }
          if (cy > 0) {
            const up = curr - w;
            if (isTrans[up] && !isBorderTrans[up]) {
              isBorderTrans[up] = 1;
              queue.push(up);
            }
          }
          if (cy < h - 1) {
            const down = curr + w;
            if (isTrans[down] && !isBorderTrans[down]) {
              isBorderTrans[down] = 1;
              queue.push(down);
            }
          }
        }

        // Check if there are inner transparent pixels enclosed by opaque frame borders
        let innerMinX = w;
        let innerMinY = h;
        let innerMaxX = -1;
        let innerMaxY = -1;
        let innerCount = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (isTrans[idx] && !isBorderTrans[idx]) {
              innerCount++;
              if (x < innerMinX) innerMinX = x;
              if (x > innerMaxX) innerMaxX = x;
              if (y < innerMinY) innerMinY = y;
              if (y > innerMaxY) innerMaxY = y;
            }
          }
        }

        // If enclosed inner cutout found (> 0.1% of pixels or > 150px)
        if (innerCount > Math.max(150, Math.round(totalPixels * 0.001)) && innerMaxX > innerMinX && innerMaxY > innerMinY) {
          resolve({
            hole: {
              x: innerMinX,
              y: innerMinY,
              width: innerMaxX - innerMinX + 1,
              height: innerMaxY - innerMinY + 1,
            },
            canvasWidth: w,
            canvasHeight: h,
            detected: true,
          });
          return;
        }

        // Otherwise (open overlay frame or transparent canvas with corner badges like Panpacific)
        let allMinX = w;
        let allMinY = h;
        let allMaxX = -1;
        let allMaxY = -1;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (isTrans[idx]) {
              if (x < allMinX) allMinX = x;
              if (x > allMaxX) allMaxX = x;
              if (y < allMinY) allMinY = y;
              if (y > allMaxY) allMaxY = y;
            }
          }
        }

        if (allMaxX > allMinX && allMaxY > allMinY) {
          resolve({
            hole: {
              x: allMinX,
              y: allMinY,
              width: allMaxX - allMinX + 1,
              height: allMaxY - allMinY + 1,
            },
            canvasWidth: w,
            canvasHeight: h,
            detected: true,
          });
          return;
        }
      }

      // Case 2: No transparent pixels (Opaque frame like JPG or solid PNG)
      // Check for solid white (r,g,b > 240) or chroma-green cutout rectangle in center region
      let solidMinX = w;
      let solidMinY = h;
      let solidMaxX = -1;
      let solidMaxY = -1;
      let solidCount = 0;

      // Scan middle 80%
      const startX = Math.round(w * 0.05);
      const endX = Math.round(w * 0.95);
      const startY = Math.round(h * 0.05);
      const endY = Math.round(h * 0.95);

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Near white box OR chroma key green box
          const isNearWhite = r > 242 && g > 242 && b > 242;
          const isChromaGreen = g > 210 && r < 70 && b < 70;

          if (isNearWhite || isChromaGreen) {
            solidCount++;
            if (x < solidMinX) solidMinX = x;
            if (x > solidMaxX) solidMaxX = x;
            if (y < solidMinY) solidMinY = y;
            if (y > solidMaxY) solidMaxY = y;
          }
        }
      }

      // If solid cutout box was detected (> 5% of pixels)
      if (solidCount > Math.round((endX - startX) * (endY - startY) * 0.05) && solidMaxX > solidMinX + 50 && solidMaxY > solidMinY + 50) {
        resolve({
          hole: {
            x: solidMinX,
            y: solidMinY,
            width: solidMaxX - solidMinX + 1,
            height: solidMaxY - solidMinY + 1,
          },
          canvasWidth: w,
          canvasHeight: h,
          detected: true,
          hasSolidCutout: true,
        });
        return;
      }

      // Fallback default hole in center if no transparent or solid window
      const fallback = {
        x: Math.round(w * 0.08),
        y: Math.round(h * 0.08),
        width: Math.round(w * 0.84),
        height: Math.round(h * 0.84),
      };
      resolve({
        hole: fallback,
        canvasWidth: w,
        canvasHeight: h,
        detected: false,
        hasSolidCutout: true,
      });
    };

    img.onerror = (err) => reject(err);
    img.src = imageDataUrl;
  });
}

/**
 * Applies Lightroom adjustment parameters (Exposure, Contrast, Saturation, Sharpness, Temperature)
 * to a source HTMLCanvasElement or Image.
 */
export function applyLightroomAdjustments(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EditSettings
) {
  const { exposure, contrast, saturation, sharpness, temperature } = settings;

  // If no adjustments are made, return early for max performance
  if (
    exposure === 0 &&
    contrast === 0 &&
    saturation === 0 &&
    sharpness === 0 &&
    temperature === 0
  ) {
    return;
  }

  const imgData = sourceCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-calculate factor constants
  // Exposure: -100 to +100 -> multiplier from 0.2 to 2.2
  const expFactor = Math.pow(2, (exposure / 100) * 1.5);

  // Contrast: -100 to +100 -> contrast factor (-255 to 255)
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  // Saturation: -100 to +100 -> factor
  const satFactor = (saturation + 100) / 100;

  // Temperature: Shift blue/red ratio
  // Temp > 0 -> Warm (more Red, less Blue)
  // Temp < 0 -> Cool (more Blue, less Red)
  const tempShiftR = temperature > 0 ? (temperature / 100) * 35 : 0;
  const tempShiftB = temperature < 0 ? (Math.abs(temperature) / 100) * 35 : 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure
    if (exposure !== 0) {
      r *= expFactor;
      g *= expFactor;
      b *= expFactor;
    }

    // 2. Contrast
    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 3. Saturation (Luminance weighting 0.299R + 0.587G + 0.114B)
    if (saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + satFactor * (r - gray);
      g = gray + satFactor * (g - gray);
      b = gray + satFactor * (b - gray);
    }

    // 4. Temperature Shift
    if (temperature !== 0) {
      r += tempShiftR;
      b += tempShiftB;
    }

    // Clamp values 0 to 255
    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  sourceCtx.putImageData(imgData, 0, 0);

  // 5. Sharpness (Convolution Unsharp Mask if > 0)
  if (sharpness > 0) {
    applySharpnessFilter(sourceCtx, width, height, sharpness / 100);
  }
}

/**
 * Fast 3x3 Sharpening Convolution Filter
 */
function applySharpnessFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const output = ctx.createImageData(width, height);
  const dst = output.data;

  // Sharpen matrix kernel
  const k = amount * 0.8;
  const kernel = [
    0, -k, 0,
    -k, 1 + 4 * k, -k,
    0, -k, 0,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dstIndex = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        let val = 0;
        let kIdx = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const srcIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += src[srcIdx] * kernel[kIdx++];
          }
        }
        dst[dstIndex + c] = Math.min(255, Math.max(0, val));
      }
      dst[dstIndex + 3] = src[dstIndex + 3]; // Alpha
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * Composite a single user photo inside the frame's transparent window.
 * Returns a high quality HTMLCanvasElement.
 */
export async function renderFramedPhotoCanvas(
  photoDataUrl: string,
  templateImg: HTMLImageElement,
  hole: HoleBoundingBox,
  settings: EditSettings,
  outputWidth?: number,
  outputHeight?: number,
  hasSolidCutout?: boolean
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';

    photoImg.onload = () => {
      const naturalW = templateImg.naturalWidth || templateImg.width || 1200;
      const naturalH = templateImg.naturalHeight || templateImg.height || 900;
      const canvasW = outputWidth || naturalW;
      const canvasH = outputHeight || naturalH;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Scale factor if template image was resized
      const scaleX = canvasW / naturalW;
      const scaleY = canvasH / naturalH;

      const holeX = Math.round(hole.x * scaleX);
      const holeY = Math.round(hole.y * scaleY);
      const holeW = Math.max(1, Math.round(hole.width * scaleX));
      const holeH = Math.max(1, Math.round(hole.height * scaleY));

      // 1. Prepare temporary photo canvas for ImageOps.fit() / cover scaling inside cutout hole
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = holeW;
      photoCanvas.height = holeH;
      const photoCtx = photoCanvas.getContext('2d');

      if (photoCtx) {
        photoCtx.imageSmoothingEnabled = true;
        photoCtx.imageSmoothingQuality = 'high';

        // Calculate ImageOps.fit / Object-Fit Cover
        const srcW = photoImg.naturalWidth || photoImg.width;
        const srcH = photoImg.naturalHeight || photoImg.height;

        const photoAspect = srcW / srcH;
        const holeAspect = holeW / holeH;

        let renderW = holeW;
        let renderH = holeH;

        if (settings.fitMode === 'cover') {
          // Cover: Fill entire hole without empty gaps
          if (photoAspect > holeAspect) {
            renderH = holeH;
            renderW = holeH * photoAspect;
          } else {
            renderW = holeW;
            renderH = holeW / photoAspect;
          }
        } else if (settings.fitMode === 'contain') {
          // Contain: Fit entire photo within hole bounds
          if (photoAspect > holeAspect) {
            renderW = holeW;
            renderH = holeW / photoAspect;
          } else {
            renderH = holeH;
            renderW = holeH * photoAspect;
          }
        } else {
          // Fill: Exact fit to hole dimensions
          renderW = holeW;
          renderH = holeH;
        }

        // Apply scale zoom and offset shift
        const scaleMultiplier = typeof settings.scale === 'number' && !isNaN(settings.scale) ? settings.scale : 1.0;
        renderW *= scaleMultiplier;
        renderH *= scaleMultiplier;

        const userOffsetX = typeof settings.offsetX === 'number' && !isNaN(settings.offsetX) ? settings.offsetX : 0;
        const userOffsetY = typeof settings.offsetY === 'number' && !isNaN(settings.offsetY) ? settings.offsetY : 0;

        const renderX = (holeW - renderW) / 2 + userOffsetX;
        const renderY = (holeH - renderH) / 2 + userOffsetY;

        // Draw photo onto photo canvas
        photoCtx.drawImage(photoImg, renderX, renderY, renderW, renderH);

        // Apply Lightroom Adjustments
        applyLightroomAdjustments(photoCtx, holeW, holeH, settings);

        // Handle Corner Radius clipping on window cutout if specified
        if (settings.cornerRadius > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(holeX, holeY, holeW, holeH, settings.cornerRadius);
          ctx.clip();
          ctx.drawImage(photoCanvas, holeX, holeY, holeW, holeH);
          ctx.restore();
        } else {
          // Draw photo inside hole coordinates
          ctx.drawImage(photoCanvas, holeX, holeY, holeW, holeH);
        }

        // Clean up temporary canvas
        photoCanvas.width = 1;
        photoCanvas.height = 1;
      }

      // 2. Overlay Frame Template on top (Layer 2)
      if (hasSolidCutout) {
        // For frames with solid/opaque cutouts (e.g. JPG or non-transparent PNG), punch out hole on frame layer
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = canvasW;
        frameCanvas.height = canvasH;
        const fCtx = frameCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(templateImg, 0, 0, canvasW, canvasH);
          fCtx.clearRect(holeX, holeY, holeW, holeH);
          ctx.drawImage(frameCanvas, 0, 0);
          frameCanvas.width = 1;
          frameCanvas.height = 1;
        } else {
          ctx.drawImage(templateImg, 0, 0, canvasW, canvasH);
        }
      } else {
        ctx.drawImage(templateImg, 0, 0, canvasW, canvasH);
      }

      resolve(canvas);
    };

    photoImg.onerror = (err) => reject(err);
    photoImg.src = photoDataUrl;
  });
}

/**
 * Batch Process Queue Runner: Processes up to 150 photos in chunks.
 * Dynamically updates progress, releases memory (garbage collection hint), and generates zip archive.
 */
export async function batchProcessPhotos(
  photos: UserPhoto[],
  templateImgUrl: string,
  hole: HoleBoundingBox,
  settings: EditSettings,
  onProgress: (completedCount: number, currentPhotoName: string, itemProgress?: number) => void,
  canvasWidth?: number,
  canvasHeight?: number,
  hasSolidCutout?: boolean
): Promise<{ zipBlob: Blob; processedPhotos: UserPhoto[] }> {
  // Preload frame template image
  const templateImg = new Image();
  templateImg.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    templateImg.onload = () => resolve();
    templateImg.onerror = (err) => reject(err);
    templateImg.src = templateImgUrl;
  });

  const zip = new JSZip();
  const folder = zip.folder('framed_photos');
  const updatedPhotos: UserPhoto[] = [];

  const batchSize = 4; // Parallel chunk size to maintain smooth UI performance

  for (let i = 0; i < photos.length; i += batchSize) {
    const chunk = photos.slice(i, i + batchSize);

    await Promise.all(
      chunk.map(async (photo, chunkIdx) => {
        const globalIdx = i + chunkIdx;
        onProgress(globalIdx, photo.name, 50);

        try {
          const canvas = await renderFramedPhotoCanvas(
            photo.dataUrl,
            templateImg,
            hole,
            settings,
            canvasWidth,
            canvasHeight,
            hasSolidCutout
          );

          // Convert canvas to PNG Blob
          const blob = await new Promise<Blob>((res) => {
            canvas.toBlob((b) => res(b || new Blob()), 'image/png', 0.95);
          });

          const dataUrl = canvas.toDataURL('image/png', 0.9);

          // Add to zip folder
          const safeName = photo.name.replace(/\.[^/.]+$/, '');
          const fileName = `framed_${globalIdx + 1}_${safeName}.png`;
          folder?.file(fileName, blob);

          const updated: UserPhoto = {
            ...photo,
            status: 'completed',
            processedBlob: blob,
            processedDataUrl: dataUrl,
            progressPercent: 100,
          };

          updatedPhotos[globalIdx] = updated;

          // Clear temporary canvas reference to trigger GC
          canvas.width = 1;
          canvas.height = 1;

          onProgress(globalIdx + 1, photo.name, 100);
        } catch (err: any) {
          console.error(`Error processing photo ${photo.name}:`, err);
          updatedPhotos[globalIdx] = {
            ...photo,
            status: 'error',
            errorMessage: err.message || 'Processing failed',
          };
        }
      })
    );

    // Yield control to UI thread briefly
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { zipBlob, processedPhotos: updatedPhotos };
}
