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

// Generate high quality sample PNG frame templates as Data URLs with transparent cutouts
export function generateSampleFrames(): FrameTemplate[] {
  const frames: FrameTemplate[] = [];

  // Frame 1: Modern Dark Gallery Frame with 16:9 Inner Transparent Cutout
  {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Outer Frame BG (Dark Matte Charcoal with subtle gradient)
      const grad = ctx.createLinearGradient(0, 0, 1200, 900);
      grad.addColorStop(0, '#1E1E24');
      grad.addColorStop(1, '#121216');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 900);

      // Beveled Frame Border (Gold Accent line)
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, 1140, 840);

      // Inner Mat Board (Light Off-White)
      ctx.fillStyle = '#F4F2EC';
      ctx.fillRect(60, 60, 1080, 780);

      // Inner Mat Drop Shadow around hole
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(145, 145, 910, 610);

      // CUTOUT TRANSPARENT WINDOW (x: 150, y: 150, w: 900, h: 600)
      ctx.clearRect(150, 150, 900, 600);

      // Subtle Inner Shadow on hole edges
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(150, 150, 900, 600);

      frames.push({
        id: 'frame_gold_gallery',
        name: 'Studio Gold Gallery',
        description: 'Classic dark charcoal mat with elegant gold border line and 3:2 cutout.',
        category: 'Modern',
        imageUrl: canvas.toDataURL('image/png'),
        hole: { x: 150, y: 150, width: 900, height: 600 },
        canvasWidth: 1200,
        canvasHeight: 900,
      });
    }
  }

  // Frame 2: Vintage Polaroid Photo Style
  {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // White/Cream Aged Polaroid Paper
      ctx.fillStyle = '#FAFAFAF0';
      ctx.fillRect(0, 0, 1000, 1200);

      // Subtle paper texture / outer border shadow
      ctx.strokeStyle = '#E0DCD3';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 984, 1184);

      // Polaroid Bottom Label Area with handwritten style text
      ctx.font = '32px Georgia, serif';
      ctx.fillStyle = '#4A4A4A';
      ctx.textAlign = 'center';
      ctx.fillText('AutoFrame Memories ✨', 500, 1080);

      // Cutout Hole (x: 100, y: 100, w: 800, h: 800)
      ctx.clearRect(100, 100, 800, 800);

      // Dark bevel line inside polaroid window
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 6;
      ctx.strokeRect(100, 100, 800, 800);

      frames.push({
        id: 'frame_polaroid_classic',
        name: 'Vintage Polaroid Frame',
        description: 'Authentic square-cut polaroid with bottom margin label.',
        category: 'Vintage',
        imageUrl: canvas.toDataURL('image/png'),
        hole: { x: 100, y: 100, width: 800, height: 800 },
        canvasWidth: 1000,
        canvasHeight: 1200,
      });
    }
  }

  // Frame 3: Sleek Minimalist Neon Border Frame
  {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark Slate Canvas
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 1200, 800);

      // Glowing Indigo/Cyan Frame Accents
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 10;
      ctx.strokeRect(40, 40, 1120, 720);

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 4;
      ctx.strokeRect(52, 52, 1096, 696);

      // Transparent Window (x: 100, y: 100, w: 1000, h: 600)
      ctx.clearRect(100, 100, 1000, 600);

      frames.push({
        id: 'frame_neon_slate',
        name: 'Cyber Slate Border',
        description: 'Modern sleek dark border with cyan and indigo accent lines.',
        category: 'Minimalist',
        imageUrl: canvas.toDataURL('image/png'),
        hole: { x: 100, y: 100, width: 1000, height: 600 },
        canvasWidth: 1200,
        canvasHeight: 800,
      });
    }
  }

  // Frame 4: Wooden Rustic Art Frame
  {
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Wood Texture Fill
      ctx.fillStyle = '#2D1B10';
      ctx.fillRect(0, 0, 1100, 1100);

      // Inner bevels
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(50, 50, 1000, 1000);

      // Cream Matting
      ctx.fillStyle = '#EFEBE9';
      ctx.fillRect(100, 100, 900, 900);

      // Transparent Window (x: 180, y: 180, w: 740, h: 740)
      ctx.clearRect(180, 180, 740, 740);

      // Shadow overlay
      ctx.strokeStyle = '#A1887F';
      ctx.lineWidth = 6;
      ctx.strokeRect(180, 180, 740, 740);

      frames.push({
        id: 'frame_rustic_wood',
        name: 'Rustic Warm Wood',
        description: 'Earthy mahogany frame with off-white inner matting.',
        category: 'Ornate',
        imageUrl: canvas.toDataURL('image/png'),
        hole: { x: 180, y: 180, width: 740, height: 740 },
        canvasWidth: 1100,
        canvasHeight: 1100,
      });
    }
  }

  return frames;
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
