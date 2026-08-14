export interface HoleBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Modern' | 'Vintage' | 'Minimalist' | 'Ornate' | 'Official';
  imageUrl: string;
  hole: HoleBoundingBox;
  canvasWidth: number;
  canvasHeight: number;
  isCustom?: boolean;
}

export interface EditSettings {
  exposure: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number; // -100 to 100
  temperature: number; // -100 to 100
  fitMode: 'cover' | 'contain' | 'fill';
  scale: number; // 0.5 to 2.0
  offsetX: number; // -200 to 200
  offsetY: number; // -200 to 200
  cornerRadius: number; // 0 to 60
}

export interface UserPhoto {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  file?: File;
  status: 'queued' | 'processing' | 'completed' | 'error';
  processedDataUrl?: string;
  processedBlob?: Blob;
  errorMessage?: string;
  progressPercent?: number;
}

export interface Preset {
  id: string;
  name: string;
  iconName?: string;
  settings: Partial<EditSettings>;
  previewColor: string;
  isCustom?: boolean;
  description?: string;
  createdAt?: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentItemName?: string;
  startTime?: number;
  elapsedMs?: number;
  estimatedRemainingMs?: number;
  averageMsPerItem?: number;
  photosPerSecond?: number;
  totalTimeMs?: number;
}
