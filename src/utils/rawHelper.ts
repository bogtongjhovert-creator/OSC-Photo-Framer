/**
 * Camera RAW File Utility
 * Extracts high-resolution embedded preview JPEGs from all major camera RAW formats:
 * - Canon: .cr2, .cr3, .crw
 * - Nikon: .nef, .nrw
 * - Sony: .arw, .srf, .sr2
 * - Fujifilm: .raf
 * - Adobe / Apple / Leica: .dng, .rwl
 * - Panasonic Lumix: .rw2
 * - Olympus / OM System: .orf
 * - Pentax / Ricoh: .pef, .ptx
 * - Samsung: .srw
 * - Generic: .raw, .3fr, .fff
 */

export const RAW_EXTENSIONS = [
  '.cr2',
  '.cr3',
  '.crw',
  '.nef',
  '.nrw',
  '.arw',
  '.srf',
  '.sr2',
  '.raf',
  '.rw2',
  '.orf',
  '.pef',
  '.ptx',
  '.dng',
  '.rwl',
  '.3fr',
  '.fff',
  '.raw',
  '.srw',
];

export const RAW_MIME_TYPES = [
  'image/x-canon-cr2',
  'image/x-canon-cr3',
  'image/x-canon-crw',
  'image/x-nikon-nef',
  'image/x-nikon-nrw',
  'image/x-sony-arw',
  'image/x-sony-srf',
  'image/x-sony-sr2',
  'image/x-fuji-raf',
  'image/x-panasonic-rw2',
  'image/x-olympus-orf',
  'image/x-pentax-pef',
  'image/x-adobe-dng',
  'image/dng',
  'image/x-raw',
  'image/raw',
];

/**
 * Checks if a file is a digital camera RAW file based on extension or MIME type.
 */
export function isRawFile(file: File | { name: string; type?: string }): boolean {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  const hasRawExt = RAW_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (hasRawExt) return true;

  if (type && RAW_MIME_TYPES.includes(type)) return true;

  return false;
}

/**
 * Returns a human-friendly camera brand label for the RAW file.
 */
export function getRawFormatLabel(fileName: string): string {
  const name = (fileName || '').toLowerCase();
  if (name.endsWith('.cr2') || name.endsWith('.cr3') || name.endsWith('.crw')) {
    return 'Canon RAW';
  }
  if (name.endsWith('.nef') || name.endsWith('.nrw')) {
    return 'Nikon RAW';
  }
  if (name.endsWith('.arw') || name.endsWith('.srf') || name.endsWith('.sr2')) {
    return 'Sony RAW';
  }
  if (name.endsWith('.raf')) {
    return 'Fujifilm RAW';
  }
  if (name.endsWith('.dng')) {
    return 'Adobe / ProRAW DNG';
  }
  if (name.endsWith('.rw2')) {
    return 'Panasonic Lumix RAW';
  }
  if (name.endsWith('.orf')) {
    return 'Olympus RAW';
  }
  if (name.endsWith('.pef') || name.endsWith('.ptx')) {
    return 'Pentax RAW';
  }
  if (name.endsWith('.srw')) {
    return 'Samsung RAW';
  }
  return 'Camera RAW';
}

interface JpegSlice {
  offset: number;
  length: number;
  width?: number;
  height?: number;
}

/**
 * Parses TIFF IFDs (used by Canon CR2, Nikon NEF, Sony ARW, DNG, Pentax PEF, Olympus ORF, Panasonic RW2).
 * Inspects IFD0, SubIFDs, and ExifIFD for embedded JPEG preview tags (0x0201 & 0x0202, or 0x0111 & 0x0117).
 */
function extractTiffPreview(buffer: Uint8Array): JpegSlice | null {
  if (buffer.length < 16) return null;

  const isLE = buffer[0] === 0x49 && buffer[1] === 0x49; // 'II'
  const isBE = buffer[0] === 0x4d && buffer[1] === 0x4d; // 'MM'
  if (!isLE && !isBE) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const readU16 = (o: number) => {
    if (o + 2 > buffer.length) return 0;
    return view.getUint16(o, isLE);
  };
  const readU32 = (o: number) => {
    if (o + 4 > buffer.length) return 0;
    return view.getUint32(o, isLE);
  };

  const ifd0Offset = readU32(4);
  if (!ifd0Offset || ifd0Offset >= buffer.length - 2) return null;

  const candidates: JpegSlice[] = [];
  const visited = new Set<number>();
  const ifdQueue: number[] = [ifd0Offset];

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
    let imageWidth = 0;
    let imageHeight = 0;

    for (let i = 0; i < numEntries; i++) {
      if (entryOffset + 12 > buffer.length) break;
      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const count = readU32(entryOffset + 4);
      let value = readU32(entryOffset + 8);
      if (type === 3) {
        // SHORT (16-bit)
        value = readU16(entryOffset + 8);
      }

      if (tag === 0x0100) imageWidth = value;
      else if (tag === 0x0101) imageHeight = value;
      else if (tag === 0x0201) jpegOffset = value; // JPEGInterchangeFormat
      else if (tag === 0x0202) jpegLength = value; // JPEGInterchangeFormatLength
      else if (tag === 0x0111) stripOffset = value; // StripOffsets
      else if (tag === 0x0117) stripByteCount = value; // StripByteCounts
      else if (tag === 0x014a) {
        // SubIFDs
        if (count === 1) {
          ifdQueue.push(value);
        } else {
          for (let s = 0; s < Math.min(count, 10); s++) {
            const subPtr = value + s * 4;
            if (subPtr + 4 <= buffer.length) {
              ifdQueue.push(readU32(subPtr));
            }
          }
        }
      } else if (tag === 0x8769) {
        // ExifIFD
        ifdQueue.push(value);
      }

      entryOffset += 12;
    }

    // Check direct JPEG Interchange tag
    if (jpegOffset > 0 && jpegLength > 500 && jpegOffset + jpegLength <= buffer.length) {
      if (buffer[jpegOffset] === 0xff && buffer[jpegOffset + 1] === 0xd8) {
        candidates.push({
          offset: jpegOffset,
          length: jpegLength,
          width: imageWidth,
          height: imageHeight,
        });
      }
    }

    // Check Strip Offset containing JPEG
    if (stripOffset > 0 && stripByteCount > 500 && stripOffset + stripByteCount <= buffer.length) {
      if (buffer[stripOffset] === 0xff && buffer[stripOffset + 1] === 0xd8) {
        candidates.push({
          offset: stripOffset,
          length: stripByteCount,
          width: imageWidth,
          height: imageHeight,
        });
      }
    }

    // Follow next IFD link
    if (entryOffset + 4 <= buffer.length) {
      const nextIfd = readU32(entryOffset);
      if (nextIfd > 0 && !visited.has(nextIfd)) {
        ifdQueue.push(nextIfd);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick the preview with the largest area or largest byte size
  candidates.sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    if (areaA > 0 && areaB > 0 && areaA !== areaB) {
      return areaB - areaA;
    }
    return b.length - a.length;
  });

  return candidates[0];
}

/**
 * Parses Fujifilm RAF header (first 16 bytes: 'FUJIFILMCCD-RAW ').
 */
function extractRafPreview(buffer: Uint8Array): JpegSlice | null {
  if (buffer.length < 96) return null;

  // Check 'FUJIFILMCCD-RAW ' magic
  const magic = String.fromCharCode(...buffer.subarray(0, 16));
  if (magic !== 'FUJIFILMCCD-RAW ') return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const jpegOffset = view.getUint32(84, false); // Big endian
  const jpegLength = view.getUint32(88, false); // Big endian

  if (
    jpegOffset > 0 &&
    jpegLength > 500 &&
    jpegOffset + jpegLength <= buffer.length &&
    buffer[jpegOffset] === 0xff &&
    buffer[jpegOffset + 1] === 0xd8
  ) {
    return { offset: jpegOffset, length: jpegLength };
  }

  return null;
}

/**
 * Universal JPEG stream scanner.
 * Scans binary data for JPEG SOI (0xFF 0xD8 0xFF) and finds the corresponding EOI (0xFF 0xD9).
 * Parses SOF dimensions and picks the highest-resolution preview.
 */
function scanForLargestJpegStream(buffer: Uint8Array): JpegSlice | null {
  const len = buffer.length;
  const candidates: { offset: number; length: number; width: number; height: number }[] = [];
  let i = 0;

  while (i < len - 3) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8 && buffer[i + 2] === 0xff) {
      const start = i;
      let pos = i + 2;
      let width = 0;
      let height = 0;
      let foundEoi = false;

      while (pos < len - 1) {
        if (buffer[pos] !== 0xff) {
          pos++;
          continue;
        }

        const marker = buffer[pos + 1];

        // Standalone or restart markers (no payload)
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
          pos += 2;
          continue;
        }

        if (marker === 0xd9) {
          // EOI - End of image
          foundEoi = true;
          pos += 2;
          break;
        }

        if (marker === 0xda) {
          // SOS - Start of Scan
          pos += 2;
          if (pos + 2 <= len) {
            const sosLen = (buffer[pos] << 8) | buffer[pos + 1];
            pos += sosLen;
          }

          // Scan through entropy data until EOI
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

        // Capture dimensions from SOF markers (SOF0 = 0xC0, SOF2 = 0xC2, etc.)
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

        // Advance past regular marker payload
        if (pos + 3 <= len) {
          const segLen = (buffer[pos + 2] << 8) | buffer[pos + 3];
          if (segLen >= 2) {
            pos += 2 + segLen;
          } else {
            pos += 2;
          }
        } else {
          pos += 2;
        }
      }

      if (foundEoi && pos > start) {
        const sliceLength = pos - start;
        // Ignore tiny thumbnail icons (< 30KB) if a larger preview exists
        candidates.push({
          offset: start,
          length: sliceLength,
          width,
          height,
        });
        i = pos - 1;
      }
    }
    i++;
  }

  if (candidates.length === 0) return null;

  // Sort by pixel resolution first, then by byte length
  candidates.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaA > 0 && areaB > 0 && areaA !== areaB) {
      return areaB - areaA;
    }
    return b.length - a.length;
  });

  return candidates[0];
}

/**
 * Extracts the embedded JPEG preview from a RAW buffer.
 * Tries TIFF parser, then RAF header, then universal stream scanner.
 */
export function extractEmbeddedJpegFromRawBuffer(buffer: Uint8Array): Uint8Array | null {
  // 1. Try TIFF IFD extraction (Canon CR2, Nikon NEF, Sony ARW, Adobe DNG, Pentax PEF, Olympus ORF, Panasonic RW2)
  const tiffPreview = extractTiffPreview(buffer);
  if (tiffPreview && tiffPreview.length > 500) {
    return buffer.subarray(tiffPreview.offset, tiffPreview.offset + tiffPreview.length);
  }

  // 2. Try Fujifilm RAF header extraction
  const rafPreview = extractRafPreview(buffer);
  if (rafPreview && rafPreview.length > 500) {
    return buffer.subarray(rafPreview.offset, rafPreview.offset + rafPreview.length);
  }

  // 3. Fallback: Universal high-speed JPEG stream scanner
  const scanned = scanForLargestJpegStream(buffer);
  if (scanned && scanned.length > 500) {
    return buffer.subarray(scanned.offset, scanned.offset + scanned.length);
  }

  return null;
}

/**
 * Converts a Blob to a Data URL string.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Blob to data URL string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Reads a Camera RAW File and converts it into a high-resolution displayable JPEG Data URL.
 * 1. Attempts instant in-browser preview extraction (0 network latency).
 * 2. Falls back to server-side `/api/convert-raw` endpoint if client extraction encounters edge cases.
 */
export async function readRawFileToDataUrl(file: File): Promise<string> {
  // Strategy 1: Instant Client-Side Extraction
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const jpegBytes = extractEmbeddedJpegFromRawBuffer(uint8Array);

    if (jpegBytes && jpegBytes.length > 0) {
      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
      return await blobToDataUrl(blob);
    }
  } catch (clientErr) {
    console.warn('Client-side RAW preview extraction failed, trying server fallback:', clientErr);
  }

  // Strategy 2: Server-side Sharp fallback (/api/convert-raw)
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch('/api/convert-raw', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server RAW conversion failed (${response.status}): ${errText}`);
    }

    const serverBlob = await response.blob();
    return await blobToDataUrl(serverBlob);
  } catch (serverErr: any) {
    console.error('Server RAW decoding also failed:', serverErr);
    throw new Error(
      `Could not decode camera RAW file "${file.name}". Please ensure it is a valid RAW photo with an embedded preview.`
    );
  }
}
