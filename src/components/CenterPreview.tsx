import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scan,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Timer,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Focus,
  Move,
  RotateCcw,
  Download,
  Edit2,
  Check,
  X,
  FileText,
  Camera,
} from 'lucide-react';
import { BatchProgress, EditSettings, FrameTemplate, HoleBoundingBox, UserPhoto } from '../types';
import { renderFramedPhotoCanvas } from '../utils/imageProcessing';
import { formatDurationSeconds, formatStopwatch, formatSpeed } from '../utils/format';

interface CenterPreviewProps {
  currentPhoto: UserPhoto | null;
  photoIndex: number;
  totalPhotos: number;
  onSelectPhotoIndex: (index: number) => void;
  frameTemplate: FrameTemplate | null;
  hole: HoleBoundingBox;
  settings: EditSettings;
  onChangeSettings?: (newSettings: EditSettings) => void;
  batchProgress?: BatchProgress;
  isProcessing?: boolean;
  onAutoFit?: (mode?: 'cover' | 'contain' | 'fill') => void;
  boxesMode?: 'color' | 'bw';
  onToggleBoxesMode?: (mode: 'color' | 'bw') => void;
  onRenamePhoto?: (photoId: string, newName: string) => void;
  onExportSinglePhoto?: (photoIndex: number, customName?: string) => Promise<void>;
  isExportingSingle?: boolean;
}

export const CenterPreview: React.FC<CenterPreviewProps> = ({
  currentPhoto,
  photoIndex,
  totalPhotos,
  onSelectPhotoIndex,
  frameTemplate,
  hole,
  settings,
  onChangeSettings,
  batchProgress,
  isProcessing = false,
  onAutoFit,
  boxesMode = 'color',
  onToggleBoxesMode,
  onRenamePhoto,
  onExportSinglePhoto,
  isExportingSingle = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [previewMode, setPreviewMode] = useState<'composite' | 'debug_hole' | 'raw_photo'>('composite');
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isRendering, setIsRendering] = useState(false);
  const [showFloatingHud, setShowFloatingHud] = useState(true);

  // Drag-to-pan state
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  // Export Filename Modal & Inline Edit states
  const [showExportModal, setShowExportModal] = useState(false);
  const [modalExportName, setModalExportName] = useState('');
  const [isEditingInlineName, setIsEditingInlineName] = useState(false);
  const [inlineName, setInlineName] = useState('');

  // Synchronize inline name when current photo changes
  useEffect(() => {
    if (currentPhoto) {
      setInlineName(
        currentPhoto.customExportName ||
          `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`
      );
    }
  }, [currentPhoto]);

  const handleOpenExportModal = () => {
    if (!currentPhoto) return;
    const initialName =
      currentPhoto.customExportName ||
      `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`;
    setModalExportName(initialName);
    setShowExportModal(true);
  };

  const handleSaveInlineName = () => {
    if (!currentPhoto || !onRenamePhoto) return;
    let clean = inlineName.trim();
    if (!clean) {
      clean = `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`;
    }
    if (!/\.(png|jpe?g|webp)$/i.test(clean)) {
      clean += '.png';
    }
    onRenamePhoto(currentPhoto.id, clean);
    setIsEditingInlineName(false);
  };

  const handleConfirmModalExport = async () => {
    if (!currentPhoto || !onExportSinglePhoto) return;
    let clean = modalExportName.trim();
    if (!clean) {
      clean = `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`;
    }
    if (!/\.(png|jpe?g|webp)$/i.test(clean)) {
      clean += '.png';
    }
    if (onRenamePhoto) {
      onRenamePhoto(currentPhoto.id, clean);
    }
    setShowExportModal(false);
    await onExportSinglePhoto(photoIndex, clean);
  };

  // Handle Drag-to-pan on canvas
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onChangeSettings || isProcessing) return;
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: settings.offsetX,
      initialOffsetY: settings.offsetY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPhoto || !dragStartRef.current || !onChangeSettings) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Adjust delta by current preview zoom level
    const adjustedDx = Math.round(dx / zoomLevel);
    const adjustedDy = Math.round(dy / zoomLevel);

    onChangeSettings({
      ...settings,
      offsetX: dragStartRef.current.initialOffsetX + adjustedDx,
      offsetY: dragStartRef.current.initialOffsetY + adjustedDy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingPhoto) return;
    setIsDraggingPhoto(false);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release pointer capture error
    }
  };

  // Handle Scroll-Wheel Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!onChangeSettings || isProcessing) return;
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
      const newScale = Math.min(3.5, Math.max(0.2, Number((settings.scale + zoomDelta).toFixed(2))));
      onChangeSettings({
        ...settings,
        scale: newScale,
      });
    },
    [onChangeSettings, settings, isProcessing]
  );

  // Quick Nudge Helpers
  const nudge = (dx: number, dy: number) => {
    if (!onChangeSettings) return;
    onChangeSettings({
      ...settings,
      offsetX: settings.offsetX + dx,
      offsetY: settings.offsetY + dy,
    });
  };

  const changeScale = (delta: number) => {
    if (!onChangeSettings) return;
    const newScale = Math.min(3.5, Math.max(0.2, Number((settings.scale + delta).toFixed(2))));
    onChangeSettings({ ...settings, scale: newScale });
  };

  // Render composite canvas whenever photo, frame, settings, or hole change
  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      if (!currentPhoto || !frameTemplate || !canvasRef.current) return;

      setIsRendering(true);

      try {
        const templateImg = new Image();
        templateImg.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          templateImg.onload = () => resolve();
          templateImg.onerror = (err) => reject(err);
          templateImg.src = frameTemplate.imageUrl;
        });

        if (isCancelled) return;

        const effectiveSettings = showOriginal
          ? { ...settings, exposure: 0, contrast: 0, saturation: 0, sharpness: 0, temperature: 0 }
          : settings;

        const renderedCanvas = await renderFramedPhotoCanvas(
          currentPhoto.dataUrl,
          templateImg,
          hole,
          effectiveSettings,
          frameTemplate.canvasWidth || 1200,
          frameTemplate.canvasHeight || 900,
          frameTemplate.hasSolidCutout
        );

        if (isCancelled || !canvasRef.current) return;

        const targetCtx = canvasRef.current.getContext('2d');
        if (targetCtx) {
          canvasRef.current.width = renderedCanvas.width;
          canvasRef.current.height = renderedCanvas.height;
          targetCtx.drawImage(renderedCanvas, 0, 0);

          // Draw Debug Cutout Box Overlay if in debug mode
          if (previewMode === 'debug_hole') {
            targetCtx.save();

            // Semi-transparent dim mask over template
            targetCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            targetCtx.fillRect(0, 0, renderedCanvas.width, renderedCanvas.height);

            // Clear hole area
            targetCtx.clearRect(hole.x, hole.y, hole.width, hole.height);

            // Glowing Animated Accent Border around hole
            targetCtx.strokeStyle = '#6366F1';
            targetCtx.lineWidth = 6;
            targetCtx.setLineDash([12, 8]);
            targetCtx.strokeRect(hole.x, hole.y, hole.width, hole.height);

            // Corner Handles
            targetCtx.fillStyle = '#EC4899';
            const s = 12;
            targetCtx.fillRect(hole.x - s / 2, hole.y - s / 2, s, s);
            targetCtx.fillRect(hole.x + hole.width - s / 2, hole.y - s / 2, s, s);
            targetCtx.fillRect(hole.x - s / 2, hole.y + hole.height - s / 2, s, s);
            targetCtx.fillRect(hole.x + hole.width - s / 2, hole.y + hole.height - s / 2, s, s);

            // Label Tag
            targetCtx.fillStyle = '#1E1B4B';
            targetCtx.fillRect(hole.x, Math.max(0, hole.y - 32), 220, 28);
            targetCtx.fillStyle = '#A5B4FC';
            targetCtx.font = 'bold 13px monospace';
            targetCtx.fillText(`Cutout: ${Math.round(hole.width)}x${Math.round(hole.height)} at (${Math.round(hole.x)},${Math.round(hole.y)})`, hole.x + 8, Math.max(18, hole.y - 12));

            targetCtx.restore();
          }
        }
      } catch (err) {
        console.error('Preview render error:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    updatePreview();

    return () => {
      isCancelled = true;
    };
  }, [currentPhoto, frameTemplate, hole, settings, previewMode, showOriginal]);

  if (!currentPhoto) {
    return (
      <div className="flex-1 bg-[#09090C] flex flex-col items-center justify-center p-8 text-center border-r border-[#22222a]">
        <div className="w-20 h-20 rounded-2xl bg-[#14141A] border border-[#282832] flex items-center justify-center mb-4 shadow-xl">
          <ImageIcon className="w-10 h-10 text-zinc-600 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-zinc-200 mb-1">No Photo Selected</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">
          Upload user photos or click &quot;Fill Sample Set&quot; in the header to preview Lightroom adjustments and transparent frame window overlays.
        </p>
      </div>
    );
  }

  if (!frameTemplate) {
    return (
      <div className="flex-1 bg-[#09090C] flex flex-col items-center justify-center p-8 text-center border-r border-[#22222a]">
        <div className="w-20 h-20 rounded-2xl bg-[#14141A] border border-[#282832] flex items-center justify-center mb-4 shadow-xl">
          <Layers className="w-10 h-10 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-zinc-200 mb-1">No Frame Template Selected</h3>
        <p className="text-xs text-zinc-400 max-w-sm">
          Upload a custom PNG frame template with a transparent cutout window in Zone A (right sidebar) to start batch framing your photos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0A0A0D] flex flex-col h-full overflow-hidden relative select-none border-r border-[#22222a]">
      {/* Viewport Toolbar */}
      <div className="bg-[#101014] border-b border-[#22222a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#17171E] p-1 rounded-xl border border-[#262630]">
          <button
            onClick={() => setPreviewMode('composite')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              previewMode === 'composite'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Framed Composite</span>
          </button>

          <button
            onClick={() => setPreviewMode('debug_hole')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              previewMode === 'debug_hole'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5 text-indigo-300" />
            <span>Cutout Hole Debug</span>
          </button>

          <button
            onClick={() => setPreviewMode('raw_photo')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              previewMode === 'raw_photo'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Raw Photo</span>
          </button>
        </div>

        {/* Quick Auto-Fit Toolbar Control */}
        {onAutoFit && (
          <div className="flex items-center gap-1 bg-[#17171E] px-2 py-1 rounded-xl border border-indigo-500/40">
            <button
              onClick={() => onAutoFit('cover')}
              className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-indigo-100 bg-indigo-600 hover:bg-indigo-500 transition flex items-center gap-1.5 shadow-sm"
              title="Automatically fit uploaded photo to fill the frame cutout window"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Auto-Fit Photo</span>
            </button>
            <div className="flex items-center gap-0.5 pl-1 border-l border-zinc-700/60">
              {(['cover', 'contain', 'fill'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onAutoFit(m)}
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition ${
                    settings.fitMode === m
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`Auto-fit using ${m} mode`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SDG & Core Value Boxes Color / B&W Quick Button Selection */}
        {onToggleBoxesMode && (
          <div className="flex items-center gap-1 bg-[#17171E] px-2 py-1 rounded-xl border border-zinc-700/60 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 pl-1 uppercase tracking-wider">Boxes:</span>
            <button
              type="button"
              onClick={() => onToggleBoxesMode('color')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                boxesMode === 'color'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Display UN SDG and Core Value boxes in full color"
            >
              <span>🎨 Color</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleBoxesMode('bw')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                boxesMode === 'bw'
                  ? 'bg-zinc-700 text-white shadow-sm ring-1 ring-zinc-400/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Display UN SDG and Core Value boxes in black & white"
            >
              <span>⚪ B&W</span>
            </button>
          </div>
        )}

        {/* Center Preview Controls */}
        <div className="flex items-center gap-3">
          {/* Before & After Hold Button */}
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
              showOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#181820] text-zinc-300 border-[#282832] hover:bg-[#20202A]'
            }`}
            title="Press and hold to compare with Original Photo"
          >
            {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showOriginal ? 'Showing Original' : 'Hold Before / After'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#14141A] px-2 py-1 rounded-lg border border-[#24242e] text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-indigo-300 font-bold px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="text-zinc-500 hover:text-zinc-300 ml-1"
              title="Reset Zoom"
            >
              <Maximize className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Export Single Framed Photo Button */}
          {onExportSinglePhoto && (
            <button
              onClick={handleOpenExportModal}
              disabled={isExportingSingle || isProcessing}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-40"
              title="Set custom file name and export this framed photo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingSingle ? 'Exporting...' : 'Export Photo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 overflow-auto flex items-center justify-center p-6 relative bg-[radial-gradient(#1E1E28_1px,transparent_1px)] [background-size:16px_16px] touch-none"
      >
        {/* Floating Quick On-Canvas Direction & Zoom Controls HUD */}
        {onChangeSettings && !isProcessing && (
          <div className="absolute bottom-4 right-4 bg-[#111118]/90 border border-[#282838] p-2.5 rounded-2xl shadow-xl backdrop-blur-md z-20 space-y-2 flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-[10px] text-zinc-400 font-mono pb-1 border-b border-[#242432]">
              <span className="flex items-center gap-1 font-bold text-indigo-300">
                <Move className="w-3 h-3" />
                Nudge &amp; Zoom
              </span>
              <button
                onClick={() => setShowFloatingHud(!showFloatingHud)}
                className="hover:text-white px-1"
              >
                {showFloatingHud ? 'Hide' : 'Show'}
              </button>
            </div>

            {showFloatingHud && (
              <>
                {/* Directional Pad Buttons */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => nudge(0, -10)}
                    className="p-1.5 rounded-lg bg-[#1D1D28] hover:bg-indigo-600 hover:text-white text-zinc-300 border border-[#2B2B3C] transition"
                    title="Nudge Top / Up (-10px)"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => nudge(-10, 0)}
                      className="p-1.5 rounded-lg bg-[#1D1D28] hover:bg-indigo-600 hover:text-white text-zinc-300 border border-[#2B2B3C] transition"
                      title="Nudge Left (-10px)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onChangeSettings({ ...settings, offsetX: 0, offsetY: 0 })}
                      className="p-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition"
                      title="Center Image (0, 0)"
                    >
                      <Focus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => nudge(10, 0)}
                      className="p-1.5 rounded-lg bg-[#1D1D28] hover:bg-indigo-600 hover:text-white text-zinc-300 border border-[#2B2B3C] transition"
                      title="Nudge Right (+10px)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => nudge(0, 10)}
                    className="p-1.5 rounded-lg bg-[#1D1D28] hover:bg-indigo-600 hover:text-white text-zinc-300 border border-[#2B2B3C] transition"
                    title="Nudge Bottom / Down (+10px)"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Zoom Bar */}
                <div className="flex items-center gap-1 pt-1 border-t border-[#242432] w-full justify-center">
                  <button
                    onClick={() => changeScale(-0.1)}
                    className="p-1 rounded bg-[#1D1D28] hover:bg-zinc-800 text-zinc-300 border border-[#2B2B3C]"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>

                  <span className="text-[10px] font-mono font-bold text-indigo-300 px-1">
                    {Math.round(settings.scale * 100)}%
                  </span>

                  <button
                    onClick={() => changeScale(0.1)}
                    className="p-1 rounded bg-[#1D1D28] hover:bg-zinc-800 text-zinc-300 border border-[#2B2B3C]"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onChangeSettings({ ...settings, scale: 1.0, offsetX: 0, offsetY: 0 })}
                    className="p-1 rounded bg-[#1D1D28] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-[#2B2B3C]"
                    title="Reset Scale & Offset"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Auto-Fit Button in Floating HUD */}
                {onAutoFit && (
                  <button
                    onClick={() => onAutoFit('cover')}
                    className="w-full py-1 px-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-700/60 transition text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm"
                    title="Automatically fit photo to frame cutout window"
                  >
                    <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Auto-Fit Window</span>
                  </button>
                )}

                {/* Offset Readout Badge */}
                <div className="text-[9px] font-mono text-zinc-400 text-center">
                  X: {settings.offsetX}px | Y: {settings.offsetY}px
                </div>
              </>
            )}
          </div>
        )}

        {/* Live Batch Processing HUD Overlay */}
        {isProcessing && batchProgress && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#12121A]/95 border border-indigo-500/50 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md z-30 min-w-[340px] max-w-md space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Batch Framing in Progress
                </span>
              </div>
              <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                {batchProgress.completed} / {batchProgress.total} ({Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100))}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100))}%`,
                }}
              />
            </div>

            {/* Timer Statistics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-[#181824] p-2 rounded-xl border border-[#2A2A3A]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                  Elapsed Time
                </span>
                <span className="text-sm font-mono font-bold text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  {formatStopwatch(batchProgress.elapsedMs || 0)}
                </span>
              </div>

              <div className="bg-[#181824] p-2 rounded-xl border border-[#2A2A3A]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                  Est. Remaining
                </span>
                <span className="text-sm font-mono font-bold text-cyan-300 flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {batchProgress.completed > 0
                    ? formatDurationSeconds(batchProgress.estimatedRemainingMs || 0)
                    : 'Calculating...'}
                </span>
              </div>

              <div className="bg-[#181824] p-2 rounded-xl border border-[#2A2A3A]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                  Speed
                </span>
                <span className="text-sm font-mono font-bold text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  {formatSpeed(batchProgress.photosPerSecond, batchProgress.averageMsPerItem)}
                </span>
              </div>
            </div>

            {batchProgress.currentItemName && (
              <p className="text-[11px] text-zinc-400 font-mono truncate text-center pt-1 border-t border-zinc-800/60">
                Framing: <span className="text-indigo-200">{batchProgress.currentItemName}</span>
              </p>
            )}
          </div>
        )}

        {isRendering && !isProcessing && (
          <div className="absolute top-4 right-4 bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur z-20">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering Canvas...</span>
          </div>
        )}

        {previewMode === 'raw_photo' ? (
          <div
            className="transition-transform duration-150 shadow-2xl rounded-lg overflow-hidden border border-[#282832]"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={currentPhoto.dataUrl}
              alt={currentPhoto.name}
              className="max-h-[600px] object-contain rounded"
            />
          </div>
        ) : (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`transition-transform duration-150 shadow-2xl rounded-lg overflow-hidden border border-[#282832]/80 bg-black/40 relative ${
              isDraggingPhoto ? 'cursor-grabbing scale-[1.002]' : 'cursor-grab hover:border-indigo-500/50'
            }`}
            style={{ transform: `scale(${zoomLevel})` }}
            title="Click and drag to adjust Top / Bottom / Left / Right photo positioning inside frame • Scroll wheel to zoom"
          >
            <canvas ref={canvasRef} className="max-h-[620px] max-w-full object-contain block pointer-events-none" />
            <div className="absolute top-2 left-2 bg-black/60 text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none opacity-80 backdrop-blur flex items-center gap-1">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Drag canvas to position • Wheel to zoom</span>
            </div>
          </div>
        )}
      </div>

      {/* Viewport Footer Photo Navigator & File Name Setter */}
      <div className="bg-[#101014] border-t border-[#22222a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-zinc-400 font-medium truncate max-w-[150px] sm:max-w-[220px]" title={currentPhoto.name}>
              📄 {currentPhoto.name}
            </span>
            {currentPhoto.isRaw && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-1 shrink-0"
                title={`${currentPhoto.rawFormatName || 'Camera RAW'} (High-res embedded preview extracted)`}
              >
                <Camera className="w-2.5 h-2.5" />
                {currentPhoto.rawFormatName || 'RAW'}
              </span>
            )}
            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
              ({currentPhoto.size / (1024 * 1024) >= 1
                ? `${(currentPhoto.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(currentPhoto.size / 1024).toFixed(0)} KB`})
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Inline Export File Name Editor */}
          <div className="flex items-center gap-1.5 bg-[#171722] px-2.5 py-1 rounded-lg border border-[#2b2b3a] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Export As:</span>
            {isEditingInlineName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={inlineName}
                  onChange={(e) => setInlineName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInlineName();
                    if (e.key === 'Escape') setIsEditingInlineName(false);
                  }}
                  placeholder="custom_name.png"
                  className="bg-[#0c0c12] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-indigo-100 font-mono focus:outline-none w-44"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveInlineName}
                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-950/40"
                  title="Save custom file name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingInlineName(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
                  title="Cancel edit"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  onClick={() => {
                    setInlineName(
                      currentPhoto.customExportName ||
                        `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`
                    );
                    setIsEditingInlineName(true);
                  }}
                  className="text-xs font-mono font-bold text-indigo-300 hover:underline cursor-pointer truncate max-w-[180px] sm:max-w-[260px]"
                  title="Click to edit export file name"
                >
                  {currentPhoto.customExportName ||
                    `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setInlineName(
                      currentPhoto.customExportName ||
                        `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_framed.png`
                    );
                    setIsEditingInlineName(true);
                  }}
                  className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-800 transition"
                  title="Edit export file name"
                >
                  <Edit2 className="w-3 h-3 text-indigo-400" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Download Button directly on footer */}
          {onExportSinglePhoto && (
            <button
              onClick={() => onExportSinglePhoto(photoIndex, currentPhoto.customExportName)}
              disabled={isExportingSingle || isProcessing}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm disabled:opacity-40"
              title="Download framed photo with this filename"
            >
              <Download className="w-3 h-3" />
              <span>{isExportingSingle ? 'Exporting...' : 'Export'}</span>
            </button>
          )}
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => onSelectPhotoIndex(Math.max(0, photoIndex - 1))}
            disabled={photoIndex === 0}
            className="p-1.5 rounded-lg bg-[#1D1D26] hover:bg-[#252530] text-zinc-300 disabled:opacity-30 transition border border-[#282832]"
            title="Previous Photo"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-zinc-300">
            {photoIndex + 1} / {totalPhotos}
          </span>

          <button
            onClick={() => onSelectPhotoIndex(Math.min(totalPhotos - 1, photoIndex + 1))}
            disabled={photoIndex >= totalPhotos - 1}
            className="p-1.5 rounded-lg bg-[#1D1D26] hover:bg-[#252530] text-zinc-300 disabled:opacity-30 transition border border-[#282832]"
            title="Next Photo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Dialog: Set File Name Before Exporting */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121218] border border-[#2C2C3C] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#242432]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Set Export File Name</h3>
                  <p className="text-[11px] text-zinc-400">Specify filename before exporting this photo</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filename Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>File Name:</span>
                <span className="text-[10px] text-zinc-500 font-mono">Will save as .png</span>
              </label>
              <div className="flex items-center bg-[#191924] border border-indigo-500/50 rounded-xl px-3 py-2 shadow-inner focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
                <input
                  type="text"
                  value={modalExportName}
                  onChange={(e) => setModalExportName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmModalExport();
                    if (e.key === 'Escape') setShowExportModal(false);
                  }}
                  className="bg-transparent text-sm text-white font-mono flex-1 focus:outline-none"
                  placeholder="e.g. panpacific_student_framed.png"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quick Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  `Panpacific_${currentPhoto.name.replace(/\.[^/.]+$/, '')}.png`,
                  `${currentPhoto.name.replace(/\.[^/.]+$/, '')}_Framed.png`,
                  `Graduation_2026_${photoIndex + 1}.png`,
                  `Official_Photo_${photoIndex + 1}.png`,
                ].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setModalExportName(sugg)}
                    className="text-[11px] font-mono bg-[#1E1E2C] hover:bg-indigo-600 hover:text-white text-zinc-300 px-2 py-1 rounded-lg border border-[#2D2D40] transition"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242432]">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalExport}
                disabled={isExportingSingle}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingSingle ? 'Exporting...' : 'Download Framed Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
