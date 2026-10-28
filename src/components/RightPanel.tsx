import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Trash2,
  FileArchive,
  Sparkles,
  Layers,
  X,
  Plus,
  Timer,
  Clock,
  Zap,
  Edit2,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  Camera,
} from 'lucide-react';
import { BatchProgress, FrameTemplate, UserPhoto, ExportNamingSettings } from '../types';
import { formatDurationSeconds, formatStopwatch, formatSpeed } from '../utils/format';
import { isRawFile } from '../utils/rawHelper';

interface RightPanelProps {
  frames: FrameTemplate[];
  selectedFrame: FrameTemplate | null;
  onSelectFrame: (frame: FrameTemplate) => void;
  onCustomFrameUpload: (file: File) => void;
  onRemoveFrame?: (id: string) => void;
  onRestorePanpacificFrame?: () => void;
  photos: UserPhoto[];
  selectedPhotoIndex: number;
  onSelectPhotoIndex: (index: number) => void;
  onUploadPhotos: (files: FileList | File[]) => void;
  onRemovePhoto: (id: string) => void;
  onRenamePhoto?: (photoId: string, newName: string) => void;
  onClearAllPhotos: () => void;
  maxPhotos: number;
  batchProgress: BatchProgress;
  onStartBatch: () => void;
  onDownloadZip: () => void;
  zipBlob: Blob | null;
  isProcessing: boolean;
  boxesMode?: 'color' | 'bw';
  onToggleBoxesMode?: (mode: 'color' | 'bw') => void;
  namingSettings?: ExportNamingSettings;
  onChangeNamingSettings?: (newSettings: ExportNamingSettings) => void;
  onExportSinglePhoto?: (photoIndex: number, customName?: string) => Promise<void>;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  frames,
  selectedFrame,
  onSelectFrame,
  onCustomFrameUpload,
  onRemoveFrame,
  onRestorePanpacificFrame,
  photos,
  selectedPhotoIndex,
  onSelectPhotoIndex,
  onUploadPhotos,
  onRemovePhoto,
  onRenamePhoto,
  onClearAllPhotos,
  maxPhotos,
  batchProgress,
  onStartBatch,
  onDownloadZip,
  zipBlob,
  isProcessing,
  boxesMode = 'color',
  onToggleBoxesMode,
  namingSettings,
  onChangeNamingSettings,
  onExportSinglePhoto,
}) => {
  const frameInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Individual photo renaming state
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingPhotoName, setEditingPhotoName] = useState('');
  const [isNamingSettingsExpanded, setIsNamingSettingsExpanded] = useState(false);

  const handleStartRename = (photo: UserPhoto) => {
    setEditingPhotoId(photo.id);
    setEditingPhotoName(photo.customExportName || `${photo.name.replace(/\.[^/.]+$/, '')}_framed.png`);
  };

  const handleSaveRename = (photoId: string) => {
    if (!onRenamePhoto) return;
    let clean = editingPhotoName.trim();
    if (clean) {
      if (!/\.(png|jpe?g|webp)$/i.test(clean)) {
        clean += '.png';
      }
      onRenamePhoto(photoId, clean);
    }
    setEditingPhotoId(null);
  };

  const handleFrameDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFrame(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      const isRaw = isRawFile(file);
      if (file.type.startsWith('image/') || isHeic || isRaw) {
        onCustomFrameUpload(file);
      } else {
        alert('Please upload an image frame template (PNG, JPG, WebP, HEIC, or RAW).');
      }
    }
  };

  const handlePhotosDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhotos(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (photos.length + files.length > maxPhotos) {
        setLimitWarning(`Maximum batch limit is ${maxPhotos} photos! Trimming extra files.`);
        setTimeout(() => setLimitWarning(null), 5000);
      }
      onUploadPhotos(files);
    }
  };

  const percent =
    batchProgress.total > 0
      ? Math.round((batchProgress.completed / batchProgress.total) * 100)
      : 0;

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-[#111115] border-l border-[#22222a] flex flex-col h-full overflow-hidden select-none">
      {/* Scrollable Container for Zone A and Zone B */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* ZONE A: PNG Frame Template Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Zone A: Frame Template
            </span>
            {onRestorePanpacificFrame && (
              <button
                onClick={onRestorePanpacificFrame}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono hover:underline flex items-center gap-1"
                title="Restore Official Panpacific University Frame"
              >
                <span>Panpacific Frame</span>
              </button>
            )}
          </div>

          {/* SDG & Core Value Boxes Color / B&W Button Selection */}
          {onToggleBoxesMode && (
            <div className="bg-[#14141E] p-2.5 rounded-xl border border-zinc-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <span>SDG &amp; Core Value Boxes</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {boxesMode === 'bw' ? '⚪ Black & White' : '🎨 Full Color'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleBoxesMode('color')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    boxesMode === 'color'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400/40'
                      : 'bg-[#1C1C24] border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title="Display UN SDG and Core Value boxes in full official colors"
                >
                  <span>🎨 Color Boxes</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleBoxesMode('bw')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    boxesMode === 'bw'
                      ? 'bg-zinc-700 border-zinc-400 text-white shadow-sm ring-1 ring-zinc-400/40'
                      : 'bg-[#1C1C24] border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title="Display UN SDG and Core Value boxes in black & white"
                >
                  <span>⚪ Black &amp; White</span>
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Custom Frame Upload Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFrame(true);
            }}
            onDragLeave={() => setIsDraggingFrame(false)}
            onDrop={handleFrameDrop}
            onClick={() => frameInputRef.current?.click()}
            className={`p-3.5 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
              isDraggingFrame
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#262630] bg-[#16161C] hover:border-zinc-700 hover:bg-[#1C1C24]'
            }`}
          >
            <input
              ref={frameInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/heic, image/heif, .heic, .heif, .cr2, .cr3, .crw, .nef, .nrw, .arw, .srf, .sr2, .raf, .rw2, .orf, .pef, .ptx, .dng, .rwl, .raw, .srw"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onCustomFrameUpload(e.target.files[0])}
            />
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Upload Frame (PNG / JPG / WebP / HEIC / RAW)
              </span>
              <span className="text-[10px] text-zinc-500">
                Cutout window auto-detected &amp; photo automatically fitted
              </span>
            </div>
          </div>

          {/* Prebuilt Templates Grid */}
          {frames.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[#262630] bg-[#14141A] text-center space-y-1">
              <p className="text-xs font-semibold text-zinc-400">No Frame Templates Loaded</p>
              <p className="text-[10px] text-zinc-500">
                Upload your frame template above to get started. Photo will automatically fit!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {frames.map((frame) => {
                const isSelected = selectedFrame?.id === frame.id;
                return (
                  <div
                    key={frame.id}
                    onClick={() => onSelectFrame(frame)}
                    className={`p-2 rounded-xl border text-left transition flex flex-col gap-1.5 relative group cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-950/40'
                        : 'border-[#262630] bg-[#16161C] hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-full h-20 bg-black/50 rounded-lg overflow-hidden border border-[#262630] relative flex items-center justify-center">
                      <img
                        src={frame.imageUrl}
                        alt={frame.name}
                        className="w-full h-full object-contain p-1"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {/* Delete Frame Button */}
                      {onRemoveFrame && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFrame(frame.id);
                          }}
                          className="absolute top-1 left-1 bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white p-1 rounded-full opacity-80 group-hover:opacity-100 transition shadow z-10"
                          title="Remove Frame Template"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-zinc-200 block truncate">
                        {frame.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        Hole: {Math.round(frame.hole.width)}x{Math.round(frame.hole.height)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <hr className="border-[#22222a]" />

        {/* ZONE B: User Photos Batch Picker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Zone B: User Photos
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                photos.length >= maxPhotos
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-indigo-500/10 text-indigo-300'
              }`}
            >
              {photos.length} / {maxPhotos}
            </span>
          </div>

          {/* Photo Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(true);
            }}
            onDragLeave={() => setIsDraggingPhotos(false)}
            onDrop={handlePhotosDrop}
            onClick={() => photosInputRef.current?.click()}
            className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
              isDraggingPhotos
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#262630] bg-[#16161C] hover:border-zinc-700 hover:bg-[#1C1C24]'
            }`}
          >
            <input
              ref={photosInputRef}
              type="file"
              multiple
              accept="image/*, .heic, .heif, image/heic, image/heif, .cr2, .cr3, .crw, .nef, .nrw, .arw, .srf, .sr2, .raf, .rw2, .orf, .pef, .ptx, .dng, .rwl, .raw, .srw"
              className="hidden"
              onChange={(e) => e.target.files && onUploadPhotos(e.target.files)}
            />
            <div className="flex flex-col items-center gap-1.5">
              <Plus className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Drag &amp; Drop Photos or Click
              </span>
              <span className="text-[10px] text-zinc-400">
                Upload up to 150 photos (JPG, PNG, HEIC, &amp; Camera RAW)
              </span>
              <span className="text-[9px] text-zinc-500">
                Canon CR2/CR3, Nikon NEF, Sony ARW, Fuji RAF, DNG, etc.
              </span>
            </div>
          </div>

          {/* Limit Warning Alert */}
          {limitWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{limitWarning}</span>
            </div>
          )}

          {/* Queue Photos List */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Queue Thumbnails</span>
                <button
                  onClick={onClearAllPhotos}
                  disabled={isProcessing}
                  className="text-[11px] text-rose-400 hover:underline disabled:opacity-50"
                >
                  Clear Queue
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {photos.map((photo, idx) => {
                  const isSelected = selectedPhotoIndex === idx;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => onSelectPhotoIndex(idx)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                          : 'border-[#262630] bg-[#16161C] text-zinc-300 hover:bg-[#1E1E28]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={photo.processedDataUrl || photo.dataUrl}
                          alt={photo.name}
                          className="w-9 h-9 object-cover rounded border border-zinc-700/80 shrink-0"
                        />
                        {editingPhotoId === photo.id ? (
                          <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingPhotoName}
                              onChange={(e) => setEditingPhotoName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(photo.id);
                                if (e.key === 'Escape') setEditingPhotoId(null);
                              }}
                              className="bg-[#0e0e14] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-indigo-100 font-mono focus:outline-none flex-1 min-w-0"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(photo.id)}
                              className="text-emerald-400 hover:text-emerald-300 p-0.5"
                              title="Save file name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPhotoId(null)}
                              className="text-zinc-500 hover:text-zinc-300 p-0.5"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="truncate text-xs font-medium" title={photo.name}>{photo.name}</p>
                              {photo.isRaw && (
                                <span
                                  className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded inline-flex items-center gap-0.5 shrink-0"
                                  title={`${photo.rawFormatName || 'Camera RAW'} (High-res preview extracted)`}
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  RAW
                                </span>
                              )}
                              {onRenamePhoto && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartRename(photo);
                                  }}
                                  className="text-zinc-500 hover:text-indigo-400 p-0.5 rounded opacity-70 hover:opacity-100 transition"
                                  title="Rename export filename for this photo"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {photo.customExportName ? (
                              <span className="text-[10px] text-indigo-300 font-mono block truncate" title={`Export filename: ${photo.customExportName}`}>
                                ↳ {photo.customExportName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono block truncate">
                                {photo.isRaw && photo.rawFormatName ? `${photo.rawFormatName} • ` : ''}
                                {photo.size / (1024 * 1024) >= 1
                                  ? `${(photo.size / (1024 * 1024)).toFixed(1)} MB`
                                  : `${(photo.size / 1024).toFixed(0)} KB`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {photo.status === 'completed' && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                        {photo.status === 'processing' && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3 animate-spin" /> ...
                          </span>
                        )}
                        {photo.status === 'queued' && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 font-semibold px-2 py-0.5 rounded">
                            Queued
                          </span>
                        )}

                        {onExportSinglePhoto && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportSinglePhoto(idx, photo.customExportName);
                            }}
                            disabled={isProcessing}
                            className="text-zinc-400 hover:text-emerald-400 p-1 rounded hover:bg-emerald-950/30 transition disabled:opacity-30"
                            title="Export & download this framed photo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePhoto(photo.id);
                          }}
                          disabled={isProcessing}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition"
                          title="Remove photo from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Monitor & Action Bar (Fixed at bottom) */}
      <div className="p-4 bg-[#0E0E12] border-t border-[#22222a] space-y-3.5">
        {/* Real-time Processing Monitor */}
        {isProcessing && (
          <div className="space-y-2.5 bg-[#161622] p-3.5 rounded-xl border border-indigo-500/40 shadow-lg shadow-indigo-950/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                Processing Batch...
              </span>
              <span className="font-mono font-extrabold text-indigo-300 text-sm">{percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Live Timing Statistics Dashboard */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
              <div className="bg-[#101018] p-1.5 rounded-lg border border-[#242432]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Elapsed</span>
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                  <Timer className="w-3 h-3 text-amber-400" />
                  {formatStopwatch(batchProgress.elapsedMs || 0)}
                </span>
              </div>

              <div className="bg-[#101018] p-1.5 rounded-lg border border-[#242432]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">ETA</span>
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {batchProgress.completed > 0
                    ? `~${formatDurationSeconds(batchProgress.estimatedRemainingMs || 0)}`
                    : 'Calc...'}
                </span>
              </div>

              <div className="bg-[#101018] p-1.5 rounded-lg border border-[#242432]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">Speed</span>
                <span className="text-xs font-mono font-bold text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  {formatSpeed(batchProgress.photosPerSecond, batchProgress.averageMsPerItem)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-0.5 truncate border-t border-[#222230]">
              <span className="truncate max-w-[190px]">
                {batchProgress.currentItemName ? `📄 ${batchProgress.currentItemName}` : 'Framing photos...'}
              </span>
              <span className="text-zinc-500 shrink-0 ml-1">
                {batchProgress.completed}/{batchProgress.total}
              </span>
            </div>
          </div>
        )}

        {/* Completion Success Banner */}
        {!isProcessing && batchProgress.status === 'completed' && zipBlob && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl space-y-1 text-xs">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Batch Framing Completed!
              </span>
              <span className="font-mono text-emerald-200">
                {formatDurationSeconds(batchProgress.totalTimeMs || batchProgress.elapsedMs || 0)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80 font-mono">
              Framed {batchProgress.total} photos at {formatSpeed(batchProgress.photosPerSecond, batchProgress.averageMsPerItem)}. ZIP package is ready!
            </p>
          </div>
        )}

        {/* Export File Naming Settings */}
        {namingSettings && onChangeNamingSettings && (
          <div className="bg-[#14141E] rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsNamingSettingsExpanded(!isNamingSettingsExpanded)}
              className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-zinc-300 hover:bg-[#1A1A26] transition text-left"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export File Naming</span>
              </span>
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
                <span className="max-w-[130px] truncate text-indigo-300">{namingSettings.zipFileName}</span>
                {isNamingSettingsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
            </button>

            {isNamingSettingsExpanded && (
              <div className="p-3 pt-1 space-y-2.5 border-t border-zinc-800/80">
                {/* ZIP Archive Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    ZIP Archive Name:
                  </label>
                  <div className="flex items-center bg-[#0E0E14] border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono">
                    <input
                      type="text"
                      value={namingSettings.zipFileName}
                      onChange={(e) =>
                        onChangeNamingSettings({ ...namingSettings, zipFileName: e.target.value })
                      }
                      className="bg-transparent text-white focus:outline-none flex-1 min-w-0"
                      placeholder="panpacific_framed_photos.zip"
                    />
                  </div>
                </div>

                {/* Batch File Prefix */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Batch File Prefix:
                  </label>
                  <div className="flex items-center bg-[#0E0E14] border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono">
                    <input
                      type="text"
                      value={namingSettings.filePrefix}
                      onChange={(e) =>
                        onChangeNamingSettings({ ...namingSettings, filePrefix: e.target.value })
                      }
                      className="bg-transparent text-white focus:outline-none flex-1 min-w-0"
                      placeholder="e.g. Panpacific_ or framed_"
                    />
                  </div>
                </div>

                {/* Naming Pattern */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Naming Format:
                  </label>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                    {[
                      { id: 'prefix_index_name', label: 'prefix_1_name' },
                      { id: 'prefix_name', label: 'prefix_name' },
                      { id: 'prefix_index', label: 'prefix_1' },
                      { id: 'name_only', label: 'name_framed' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() =>
                          onChangeNamingSettings({
                            ...namingSettings,
                            namingPattern: fmt.id as any,
                          })
                        }
                        className={`py-1 px-1.5 rounded border text-center transition ${
                          namingSettings.namingPattern === fmt.id
                            ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                            : 'bg-[#181824] border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Output Preview */}
                <div className="bg-[#0B0B10] p-2 rounded-lg border border-zinc-800/80 text-[10px] font-mono text-zinc-400 space-y-0.5">
                  <span className="text-zinc-500 font-sans font-bold uppercase text-[9px] block">Live Batch Preview:</span>
                  <p className="text-emerald-400 truncate">
                    {namingSettings.namingPattern === 'prefix_name' && `${namingSettings.filePrefix}portrait.png`}
                    {namingSettings.namingPattern === 'prefix_index' && `${namingSettings.filePrefix}1.png`}
                    {namingSettings.namingPattern === 'name_only' && `portrait_framed.png`}
                    {namingSettings.namingPattern === 'prefix_index_name' && `${namingSettings.filePrefix}1_portrait.png`}
                  </p>
                  <span className="text-[9px] text-zinc-500 block">
                    *Individual photos renamed in queue or preview keep their exact custom names.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="space-y-2">
          {/* Start Batch Button */}
          <button
            onClick={onStartBatch}
            disabled={photos.length === 0 || isProcessing}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-950/60 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isProcessing ? 'Framing Photos...' : `Start Batch Framing (${photos.length})`}</span>
          </button>

          {/* Download ZIP Button */}
          <button
            onClick={onDownloadZip}
            disabled={!zipBlob || isProcessing}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 border ${
              zipBlob
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-950/60 animate-pulse'
                : 'bg-[#16161C] text-zinc-500 border-[#262630] disabled:opacity-40'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>Download All (ZIP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
