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

// Generate sample PNG frame templates (Includes permanent Panpacific University official frame)
export function createPanpacificUniversityFrame(): FrameTemplate {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Top-Left Badge (White rounded corner block)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    const badgeW = 250;
    const badgeH = 160;
    const badgeR = 28;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(badgeW, 0);
    ctx.lineTo(badgeW, badgeH - badgeR);
    ctx.arcTo(badgeW, badgeH, badgeW - badgeR, badgeH, badgeR);
    ctx.lineTo(0, badgeH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Panpacific Mountain Roof Icon Logo
    // Left green roof bar
    ctx.fillStyle = '#1D5D3A';
    ctx.beginPath();
    ctx.moveTo(60, 75);
    ctx.lineTo(125, 25);
    ctx.lineTo(145, 45);
    ctx.lineTo(100, 80);
    ctx.closePath();
    ctx.fill();

    // Right blue interlocked bar
    ctx.fillStyle = '#0F4B81';
    ctx.beginPath();
    ctx.moveTo(125, 25);
    ctx.lineTo(190, 75);
    ctx.lineTo(170, 85);
    ctx.lineTo(125, 50);
    ctx.lineTo(100, 80);
    ctx.closePath();
    ctx.fill();

    // Green bottom cross bar
    ctx.fillStyle = '#1D5D3A';
    ctx.beginPath();
    ctx.moveTo(70, 85);
    ctx.lineTo(180, 85);
    ctx.lineTo(170, 96);
    ctx.lineTo(80, 96);
    ctx.closePath();
    ctx.fill();

    // Text: PANPACIFIC
    ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#1D5D3A';
    ctx.textAlign = 'center';
    ctx.fillText('PANPACIFIC', 125, 122);

    // Text: UNIVERSITY
    ctx.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#1D5D3A';
    ctx.fillText('U N I V E R S I T Y', 125, 140);

    // 2. Bottom Footer Banner (Off-White rounded bar with seals & social media)
    const footerX = 15;
    const footerY = 885;
    const footerW = 1890;
    const footerH = 180;
    const footerR = 30;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = -2;

    ctx.fillStyle = '#EFF1F3';
    ctx.beginPath();
    ctx.roundRect(footerX, footerY, footerW, footerH, [footerR, footerR, 0, 0]);
    ctx.fill();
    ctx.restore();

    // Border line on footer
    ctx.strokeStyle = '#DDE0E5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(footerX, footerY, footerW, footerH, [footerR, footerR, 0, 0]);
    ctx.stroke();

    // --- ROW 1: ACCREDITATION & UNIVERSITY SEALS (Y ~ 925) ---
    // Seal 1: 33 ONE PANPACIFIC Anniversary Logo
    ctx.fillStyle = '#E91E63';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('33', 70, 928);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#1D5D3A';
    ctx.fillText('ONE PANPACIFIC', 70, 942);

    // Seal 2: PACUCOA Green Circular Seal
    ctx.fillStyle = '#1B5E39';
    ctx.beginPath();
    ctx.arc(135, 928, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(135, 928, 12, 0, Math.PI * 2);
    ctx.fill();

    // Seal 3: DNV ISO Badge
    ctx.fillStyle = '#004B87';
    ctx.beginPath();
    ctx.arc(182, 928, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('DNV', 182, 932);

    // Seal 4: AUTONOMOUS STATUS
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#0F2C59';
    ctx.fillText('AUTONOMOUS', 215, 925);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#00A8E8';
    ctx.fillText('S T A T U S', 215, 938);
    ctx.fillStyle = '#00A8E8';
    ctx.fillRect(215, 942, 105, 3);

    // Seal 5: QS STARS RATING SYSTEM
    ctx.fillStyle = '#0F2C59';
    ctx.fillRect(335, 912, 60, 30);
    ctx.fillStyle = '#FFC107';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('QS STARS', 340, 925);
    ctx.fillText('★★★', 342, 938);

    // Seal 6: WURI
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#0A4D8C';
    ctx.fillText('WURI', 410, 930);

    // Seal 7: UI GreenMetric
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(475, 928, 16, 0, Math.PI * 2);
    ctx.fill();

    // Seal 8: Times Higher Education
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(505, 912, 85, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Impact Rankings', 510, 930);

    // Seal 9: TESDA
    ctx.fillStyle = '#0277BD';
    ctx.beginPath();
    ctx.arc(612, 928, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TESDA', 612, 932);

    // Seal 10: Shield Logo
    ctx.fillStyle = '#F57F17';
    ctx.beginPath();
    ctx.arc(648, 928, 14, 0, Math.PI * 2);
    ctx.fill();

    // --- UN SDG 17 BOXES GRID (Far Right, X: 1420) ---
    const sdgColors = [
      '#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21', '#26BDE2', '#FCC30B', '#A21942',
      '#FD6925', '#DD1367', '#FD9D24', '#BF8B2E', '#3F7E44', '#0A97D9', '#56C02B', '#00689D', '#19486A'
    ];

    const sdgStartX = 1420;
    const sdgBoxW = 48;
    const sdgBoxH = 34;
    const sdgGap = 5;

    ctx.textAlign = 'center';
    ctx.font = 'bold 10px sans-serif';

    // SDG Header Box
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(sdgStartX - 55, 898, 50, 73);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('SUSTAINABLE', sdgStartX - 30, 920);
    ctx.fillText('DEVELOPMENT', sdgStartX - 30, 932);
    ctx.fillText('GOALS', sdgStartX - 30, 944);

    // Row 1 (SDGs 1-8)
    for (let i = 0; i < 8; i++) {
      const bx = sdgStartX + i * (sdgBoxW + sdgGap);
      const by = 898;
      ctx.fillStyle = sdgColors[i];
      ctx.fillRect(bx, by, sdgBoxW, sdgBoxH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${i + 1}`, bx + sdgBoxW / 2, by + 22);
    }

    // Row 2 (SDGs 9-17)
    for (let i = 8; i < 17; i++) {
      const col = i - 8;
      const bx = sdgStartX + col * (sdgBoxW + sdgGap);
      const by = 898 + sdgBoxH + sdgGap;
      ctx.fillStyle = sdgColors[i];
      ctx.fillRect(bx, by, sdgBoxW, sdgBoxH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${i + 1}`, bx + sdgBoxW / 2, by + 22);
    }

    // --- ROW 2: SOCIAL MEDIA CONNECTIONS (Y ~ 1025) ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText('CONNECT WITH US:', 50, 1025);

    const socXStart = 310;
    const socItems = [
      { type: 'fb', iconColor: '#1877F2', text: 'panpacificu' },
      { type: 'fb', iconColor: '#1877F2', text: 'officialpunptayug' },
      { type: 'tiktok', iconColor: '#000000', text: 'panpacificu' },
      { type: 'insta', iconColor: '#E1306C', text: 'panpacificu_' },
      { type: 'web', iconColor: '#0072CE', text: 'www.panpacificu.edu.ph' },
    ];

    let currentSocX = socXStart;
    socItems.forEach((soc) => {
      // Circle icon
      ctx.fillStyle = soc.iconColor;
      ctx.beginPath();
      ctx.arc(currentSocX + 12, 1018, 12, 0, Math.PI * 2);
      ctx.fill();

      // Icon symbol
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      if (soc.type === 'fb') ctx.fillText('f', currentSocX + 12, 1022);
      else if (soc.type === 'tiktok') ctx.fillText('d', currentSocX + 12, 1022);
      else if (soc.type === 'insta') ctx.fillText('📷', currentSocX + 12, 1021);
      else ctx.fillText('🌐', currentSocX + 12, 1022);

      // Username text
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#222222';
      ctx.fillText(soc.text, currentSocX + 30, 1023);

      currentSocX += ctx.measureText(soc.text).width + 70;
    });
  }

  return {
    id: 'frame_panpacific_university_official',
    name: 'Panpacific University Frame',
    description: 'Permanent official Panpacific University photo frame template.',
    category: 'Official',
    imageUrl: canvas.toDataURL('image/png'),
    hole: { x: 0, y: 0, width: 1920, height: 1080 },
    canvasWidth: 1920,
    canvasHeight: 1080,
  };
}

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
