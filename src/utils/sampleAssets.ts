import { FrameTemplate, UserPhoto, EditSettings } from '../types';

export const DEFAULT_EDIT_SETTINGS: EditSettings = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  temperature: 0,
  fitMode: 'cover',
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  cornerRadius: 0,
};

// Generate sample PNG frame templates (Empty by default as requested by user)
export function generateSampleFrames(): FrameTemplate[] {
  return [];
}

// Generate vivid sample photos as Data URLs for immediate testing
export function generateSamplePhotos(count: number = 5): UserPhoto[] {
  const photoPresets = [
    { name: 'Mountain Sunrise.jpg', bg1: '#FF512F', bg2: '#DD2476', label: '🏔️ Alpine Sunrise' },
    { name: 'Urban Neon Skyline.jpg', bg1: '#8A2387', bg2: '#E94057', label: '🌃 Urban Skyline' },
    { name: 'Emerald Forest.jpg', bg1: '#134E5E', bg2: '#71B280', label: '🌲 Emerald Forest' },
    { name: 'Ocean Sunset.jpg', bg1: '#2193b0', bg2: '#6dd5ed', label: '🌊 Ocean Wave' },
    { name: 'Golden Hour Portrait.jpg', bg1: '#F2994A', bg2: '#F2C94C', label: '🌅 Golden Portrait' },
  ];

  const photos: UserPhoto[] = [];

  for (let i = 0; i < count; i++) {
    const preset = photoPresets[i % photoPresets.length];
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dynamic Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 800);
      grad.addColorStop(0, preset.bg1);
      grad.addColorStop(1, preset.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 800);

      // Decorative geometry/shapes to make photo look interesting
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(600 + (i * 30), 400, 280, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(300, 200, 180, 0, Math.PI * 2);
      ctx.fill();

      // Text Overlay
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.textAlign = 'center';
      ctx.fillText(`${preset.label} #${i + 1}`, 600, 420);

      ctx.font = '24px sans-serif';
      ctx.fillText(`Sample Photo High-Res (${1200}x${800})`, 600, 480);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      photos.push({
        id: `sample_photo_${Date.now()}_${i}`,
        name: `${i + 1}_${preset.name}`,
        size: 850000 + (i * 12000),
        dataUrl,
        status: 'queued',
      });
    }
  }

  return photos;
}
