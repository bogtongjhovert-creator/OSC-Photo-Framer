import heic2any from 'heic2any';

/**
 * Checks if a given file is a HEIC or HEIF image based on its name or MIME type.
 */
export function isHeicFile(file: File): boolean {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  );
}

/**
 * Converts a HEIC/HEIF File to a standard JPEG Data URL.
 * Uses client-side WebAssembly heic2any first, with seamless fallback
 * to server-side Sharp libheif endpoint (/api/convert-heic).
 */
export async function convertHeicFileToDataUrl(file: File): Promise<string> {
  // Strategy 1: Client-side conversion using heic2any
  try {
    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.94,
    });

    const outputBlob = Array.isArray(conversionResult)
      ? conversionResult[0]
      : conversionResult;

    if (outputBlob && outputBlob.size > 0) {
      return await blobToDataUrl(outputBlob);
    }
  } catch (clientError) {
    console.warn(
      'Client-side heic2any conversion had an issue, falling back to server sharp:',
      clientError
    );
  }

  // Strategy 2: Server-side Sharp fallback (/api/convert-heic)
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch('/api/convert-heic', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server conversion error (${response.status}): ${errText}`);
    }

    const serverBlob = await response.blob();
    return await blobToDataUrl(serverBlob);
  } catch (serverError) {
    console.error('Server HEIC conversion also failed:', serverError);
    throw new Error(
      `Could not decode HEIC file "${file.name}". Please ensure it is a valid Apple HEIC/HEIF photo.`
    );
  }
}

/**
 * Universal file reader that supports PNG, JPG, WebP, GIF, and converts HEIC/HEIF automatically.
 */
export async function readFileToDataUrl(file: File): Promise<string> {
  if (isHeicFile(file)) {
    return await convertHeicFileToDataUrl(file);
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error on blob'));
    reader.readAsDataURL(blob);
  });
}
