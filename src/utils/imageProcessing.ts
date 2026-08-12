import JSZip from 'jszip';
import { EditSettings, HoleBoundingBox, UserPhoto } from '../types';

/**
 * Automatically detects the bounding box (x, y, width, height) of the transparent cutout
 * window in a PNG image by scanning the alpha channel.
 */
export async function detectTransparentHole(
  imageDataUrl: string,
  alphaThreshold: number = 30
): Promise<{ hole: HoleBoundingBox; canvasWidth: number; canvasHeight: number; detected: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;

      let minX = img.width;
      let minY = img.height;
      let maxX = -1;
      let maxY = -1;
      let transparentCount = 0;

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const alphaIndex = (y * img.width + x) * 4 + 3;
          const alpha = data[alphaIndex];

          if (alpha < alphaThreshold) {
            transparentCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (transparentCount === 0 || maxX < minX || maxY < minY) {
        // Fallback default hole in center if no transparent window
        const fallback = {
          x: Math.round(img.width * 0.1),
          y: Math.round(img.height * 0.1),
          width: Math.round(img.width * 0.8),
          height: Math.round(img.height * 0.8),
        };
        resolve({
          hole: fallback,
          canvasWidth: img.width,
          canvasHeight: img.height,
          detected: false,
        });
        return;
      }

      resolve({
        hole: {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
        canvasWidth: img.width,
        canvasHeight: img.height,
        detected: true,
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
  outputHeight?: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';

    photoImg.onload = () => {
      const canvasW = outputWidth || templateImg.width || 1200;
      const canvasH = outputHeight || templateImg.height || 900;

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
      const scaleX = canvasW / (templateImg.width || canvasW);
      const scaleY = canvasH / (templateImg.height || canvasH);

      const holeX = hole.x * scaleX;
      const holeY = hole.y * scaleY;
      const holeW = hole.width * scaleX;
      const holeH = hole.height * scaleY;

      // 1. Prepare temporary photo canvas for ImageOps.fit() / cover scaling inside cutout hole
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = Math.round(holeW);
      photoCanvas.height = Math.round(holeH);
      const photoCtx = photoCanvas.getContext('2d');

      if (photoCtx) {
        photoCtx.imageSmoothingEnabled = true;
        photoCtx.imageSmoothingQuality = 'high';

        // Calculate ImageOps.fit / Object-Fit Cover
        const srcW = photoImg.width;
        const srcH = photoImg.height;

        const photoAspect = srcW / srcH;
        const holeAspect = holeW / holeH;

        let renderW = holeW;
        let renderH = holeH;

        if (settings.fitMode === 'cover') {
          if (photoAspect > holeAspect) {
            renderH = holeH;
            renderW = holeH * photoAspect;
          } else {
            renderW = holeW;
            renderH = holeW / photoAspect;
          }
        } else if (settings.fitMode === 'contain') {
          if (photoAspect > holeAspect) {
            renderW = holeW;
            renderH = holeW / photoAspect;
          } else {
            renderH = holeH;
            renderW = holeH * photoAspect;
          }
        }

        // Apply scale zoom and offset shift
        renderW *= settings.scale;
        renderH *= settings.scale;

        const renderX = (holeW - renderW) / 2 + settings.offsetX;
        const renderY = (holeH - renderH) / 2 + settings.offsetY;

        // Draw photo onto photo canvas
        photoCtx.drawImage(photoImg, renderX, renderY, renderW, renderH);

        // Apply Lightroom Adjustments
        applyLightroomAdjustments(photoCtx, Math.round(holeW), Math.round(holeH), settings);

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
      ctx.drawImage(templateImg, 0, 0, canvasW, canvasH);

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
  onProgress: (completedCount: number, currentPhotoName: string, itemProgress?: number) => void
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
            settings
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
