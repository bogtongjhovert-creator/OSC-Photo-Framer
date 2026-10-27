import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { CenterPreview } from './components/CenterPreview';
import { RightPanel } from './components/RightPanel';
import {
  FrameTemplate,
  UserPhoto,
  EditSettings,
  HoleBoundingBox,
  BatchProgress,
  Preset,
  ExportNamingSettings,
} from './types';
import {
  generateSamplePhotos,
  generateSampleFrames,
  createPanpacificUniversityFrame,
  DEFAULT_EDIT_SETTINGS,
} from './utils/sampleAssets';
import {
  loadCustomPresets,
  saveCustomPresets,
  createCustomPreset,
  exportPresetsToJson,
} from './utils/presets';
import {
  detectTransparentHole,
  batchProcessPhotos,
  exportSingleFramedPhoto,
} from './utils/imageProcessing';
import { isHeicFile, readFileToDataUrl } from './utils/heicHelper';

export default function App() {
  const MAX_PHOTOS = 150;

  // Initial Sample Frames (Default Panpacific University in Color & B&W)
  const [frames, setFrames] = useState<FrameTemplate[]>(() => generateSampleFrames());
  const [boxesMode, setBoxesMode] = useState<'color' | 'bw'>('color');
  const [selectedFrame, setSelectedFrame] = useState<FrameTemplate | null>(() => {
    const initialFrames = generateSampleFrames();
    return initialFrames[0] || null;
  });
  const [hole, setHole] = useState<HoleBoundingBox>(() => {
    const initialFrames = generateSampleFrames();
    return initialFrames[0]?.hole || { x: 0, y: 0, width: 1920, height: 1080 };
  });
  const [isDetectingHole, setIsDetectingHole] = useState(false);

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  const [settings, setSettings] = useState<EditSettings>(DEFAULT_EDIT_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('default');
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => loadCustomPresets());

  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    status: 'idle',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [autoFitOnUpload, setAutoFitOnUpload] = useState<boolean>(true);
  const [fitToastMessage, setFitToastMessage] = useState<string | null>(null);

  // Export File Naming Settings
  const [namingSettings, setNamingSettings] = useState<ExportNamingSettings>({
    zipFileName: 'panpacific_framed_photos.zip',
    filePrefix: 'framed_',
    namingPattern: 'prefix_index_name',
  });
  const [isExportingSingle, setIsExportingSingle] = useState(false);

  const showFitToast = useCallback((msg: string) => {
    setFitToastMessage(msg);
    setTimeout(() => {
      setFitToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Automatically fit photo to frame hole
  const handleAutoFit = useCallback(
    (mode?: 'cover' | 'contain' | 'fill') => {
      const targetMode = mode || settings.fitMode || 'cover';
      setSettings((prev) => ({
        ...prev,
        fitMode: targetMode,
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
      }));
      showFitToast(`⚡ Photo automatically fitted to frame window (${targetMode.toUpperCase()})`);
    },
    [settings.fitMode, showFitToast]
  );

  // Automatically save custom presets to localStorage whenever updated
  useEffect(() => {
    saveCustomPresets(customPresets);
  }, [customPresets]);

  // Handle PNG/Image Frame Template Selection & Hole Auto-Detection
  const handleSelectFrame = useCallback(async (frame: FrameTemplate) => {
    setSelectedFrame(frame);
    setIsDetectingHole(true);

    try {
      const detection = await detectTransparentHole(frame.imageUrl);
      setHole(detection.hole);
      if (detection.hasSolidCutout) {
        frame.hasSolidCutout = true;
      }
    } catch (err) {
      console.error('Hole detection failed, using pre-configured hole:', err);
      setHole(frame.hole);
    } finally {
      setIsDetectingHole(false);
    }

    if (autoFitOnUpload) {
      setSettings((prev) => ({
        ...prev,
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
      }));
    }
  }, [autoFitOnUpload]);

  // Toggle SDG & Core Value boxes mode (Color vs Black & White)
  const handleToggleBoxesMode = useCallback(
    (mode: 'color' | 'bw') => {
      setBoxesMode(mode);
      const targetFrame = createPanpacificUniversityFrame(mode);

      // Keep both variants accessible in templates list
      setFrames((prev) => {
        const withoutPanpacific = prev.filter((f) => !f.id.startsWith('frame_panpacific'));
        const colorFrame = createPanpacificUniversityFrame('color');
        const bwFrame = createPanpacificUniversityFrame('bw');
        return mode === 'color'
          ? [colorFrame, bwFrame, ...withoutPanpacific]
          : [bwFrame, colorFrame, ...withoutPanpacific];
      });

      setSelectedFrame(targetFrame);
      setHole(targetFrame.hole);
      showFitToast(
        `⚡ Frame Boxes switched to ${mode === 'bw' ? 'BLACK & WHITE' : 'FULL COLOR'}`
      );
    },
    [showFitToast]
  );

  // Handle Custom Frame Upload (Supports PNG, JPG, WebP, and iPhone HEIC/HEIF)
  const handleCustomFrameUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !isHeicFile(file)) {
      alert('Please upload an image file (PNG, JPG, WebP, or HEIC).');
      return;
    }

    setIsDetectingHole(true);
    try {
      if (isHeicFile(file)) {
        showFitToast(`Converting iPhone HEIC frame "${file.name}"...`);
      }
      const dataUrl = await readFileToDataUrl(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const detection = await detectTransparentHole(dataUrl);
          const newFrame: FrameTemplate = {
            id: `custom_frame_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            description: detection.detected
              ? `Cutout detected: ${Math.round(detection.hole.width)}×${Math.round(detection.hole.height)}px`
              : 'Custom uploaded template',
            category: 'Modern',
            imageUrl: dataUrl,
            hole: detection.hole,
            canvasWidth: img.width,
            canvasHeight: img.height,
            isCustom: true,
            hasSolidCutout: detection.hasSolidCutout,
          };

          setFrames((prev) => [newFrame, ...prev]);
          setSelectedFrame(newFrame);
          setHole(detection.hole);

          // Automatically fit photo to newly uploaded frame
          if (autoFitOnUpload) {
            setSettings((prev) => ({
              ...prev,
              scale: 1.0,
              offsetX: 0,
              offsetY: 0,
            }));
            showFitToast(`⚡ Photo automatically fitted to ${newFrame.name}!`);
          }
        } catch (err) {
          console.error('Error auto-detecting hole for custom upload:', err);
        } finally {
          setIsDetectingHole(false);
        }
      };
      img.src = dataUrl;
    } catch (err: any) {
      console.error('Error loading custom frame:', err);
      setIsDetectingHole(false);
      alert(`Could not load custom frame "${file.name}": ${err.message || 'Error reading image'}`);
    }
  }, [autoFitOnUpload, showFitToast]);

  // Remove Frame Template
  const handleRemoveFrame = useCallback(
    (id: string) => {
      setFrames((prev) => {
        const nextFrames = prev.filter((f) => f.id !== id);
        if (selectedFrame?.id === id) {
          if (nextFrames.length > 0) {
            setSelectedFrame(nextFrames[0]);
            setHole(nextFrames[0].hole);
          } else {
            setSelectedFrame(null);
          }
        }
        return nextFrames;
      });
    },
    [selectedFrame]
  );

  // Restore Official Panpacific University Frame
  const handleRestorePanpacificFrame = useCallback(() => {
    const panpacificFrame = createPanpacificUniversityFrame(boxesMode);
    setFrames((prev) => {
      const exists = prev.some((f) => f.id === panpacificFrame.id);
      if (!exists) {
        return [panpacificFrame, ...prev];
      }
      return prev;
    });
    setSelectedFrame(panpacificFrame);
    setHole(panpacificFrame.hole);
    showFitToast(`⚡ Restored Official Panpacific University Frame (${boxesMode.toUpperCase()})`);
  }, [boxesMode, showFitToast]);

  // Re-detect hole on demand
  const handleDetectHole = useCallback(async () => {
    if (!selectedFrame) return;
    setIsDetectingHole(true);
    try {
      const detection = await detectTransparentHole(selectedFrame.imageUrl);
      setHole(detection.hole);
    } catch (err) {
      console.error('Error re-detecting hole:', err);
    } finally {
      setIsDetectingHole(false);
    }
  }, [selectedFrame]);

  // Handle Photo Uploads (Supports PNG, JPG, WebP, and iPhone HEIC/HEIF up to 150 limit)
  const handleUploadPhotos = useCallback(
    async (files: FileList | File[]) => {
      const newFiles = Array.from(files);
      const remainingSlots = MAX_PHOTOS - photos.length;

      if (remainingSlots <= 0) {
        alert(`You have reached the maximum batch limit of ${MAX_PHOTOS} photos.`);
        return;
      }

      const filesToProcess = newFiles.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        try {
          if (isHeicFile(file)) {
            showFitToast(`Converting iPhone HEIC photo "${file.name}"...`);
          }
          const dataUrl = await readFileToDataUrl(file);
          const newPhoto: UserPhoto = {
            id: `photo_${Date.now()}_${Math.random()}`,
            name: file.name,
            size: file.size,
            dataUrl,
            file,
            status: 'queued',
          };

          setPhotos((prev) => {
            if (prev.length >= MAX_PHOTOS) return prev;
            return [...prev, newPhoto];
          });
        } catch (err: any) {
          console.error('Failed to read photo:', err);
          showFitToast(`⚠️ Error loading ${file.name}: ${err.message || 'HEIC decoding error'}`);
        }
      }

      // Automatically reset scale & offset so the newly uploaded photo fits into the frame window
      if (autoFitOnUpload) {
        setSettings((prev) => ({
          ...prev,
          scale: 1.0,
          offsetX: 0,
          offsetY: 0,
        }));
        showFitToast('⚡ Uploaded photo automatically fitted to frame cutout window!');
      }
    },
    [photos.length, MAX_PHOTOS, autoFitOnUpload, showFitToast]
  );

  // Populate sample photos up to specified target
  const handlePopulateSamplePhotos = useCallback(
    (targetCount: number) => {
      const needed = Math.min(targetCount, MAX_PHOTOS - photos.length);
      if (needed <= 0) return;

      const generated = generateSamplePhotos(needed);
      setPhotos((prev) => [...prev, ...generated]);
    },
    [photos.length, MAX_PHOTOS]
  );

  // Remove Photo from Queue
  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered;
    });
    setSelectedPhotoIndex((curr) => Math.max(0, curr - 1));
  }, []);

  // Rename Photo Custom Export Filename
  const handleRenamePhoto = useCallback((photoId: string, newName: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        return {
          ...p,
          customExportName: newName.trim(),
        };
      })
    );
  }, []);

  // Clear All Photos
  const handleClearAllPhotos = useCallback(() => {
    setPhotos([]);
    setSelectedPhotoIndex(0);
    setZipBlob(null);
    setBatchProgress({ total: 0, completed: 0, status: 'idle' });
  }, []);

  // Select Preset
  const handleSelectPreset = useCallback((preset: Preset) => {
    setActivePresetId(preset.id);
    setSettings((prev) => ({
      ...prev,
      ...preset.settings,
    }));
  }, []);

  // Save new custom preset
  const handleSaveCustomPreset = useCallback(
    (name: string, color: string, description?: string) => {
      const newPreset = createCustomPreset(name, settings, color, description);
      setCustomPresets((prev) => [newPreset, ...prev]);
      setActivePresetId(newPreset.id);
    },
    [settings]
  );

  // Update existing custom preset (either rename/recolor or update with current sliders)
  const handleUpdateCustomPreset = useCallback(
    (presetId: string, name?: string, color?: string, description?: string) => {
      setCustomPresets((prev) =>
        prev.map((p) => {
          if (p.id !== presetId) return p;
          return {
            ...p,
            name: name ?? p.name,
            previewColor: color ?? p.previewColor,
            description: description !== undefined ? description : p.description,
            settings: {
              exposure: settings.exposure,
              contrast: settings.contrast,
              saturation: settings.saturation,
              sharpness: settings.sharpness,
              temperature: settings.temperature,
            },
          };
        })
      );
      setActivePresetId(presetId);
    },
    [settings]
  );

  // Delete custom preset
  const handleDeleteCustomPreset = useCallback(
    (presetId: string) => {
      setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
      if (activePresetId === presetId) {
        setActivePresetId('default');
      }
    },
    [activePresetId]
  );

  // Import custom presets from JSON
  const handleImportPresets = useCallback((imported: Preset[]) => {
    setCustomPresets((prev) => {
      // Filter out duplicates by name or id
      const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
      const filteredNew = imported.filter((p) => !existingNames.has(p.name.toLowerCase()));
      return [...filteredNew, ...prev];
    });
    if (imported.length > 0) {
      setActivePresetId(imported[0].id);
      if (imported[0].settings) {
        setSettings((prev) => ({ ...prev, ...imported[0].settings }));
      }
    }
  }, []);

  // Export custom presets to JSON
  const handleExportPresets = useCallback(() => {
    exportPresetsToJson(customPresets);
  }, [customPresets]);

  // Live timer interval for batch progress
  useEffect(() => {
    if (batchProgress.status !== 'running' || !batchProgress.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - batchProgress.startTime!;
      const completed = batchProgress.completed;
      const total = batchProgress.total;
      const remaining = total - completed;

      const averageMsPerItem = completed > 0 ? elapsedMs / completed : 0;
      const estimatedRemainingMs = remaining > 0 && completed > 0 ? remaining * averageMsPerItem : 0;
      const photosPerSecond = elapsedMs > 0 ? (completed / (elapsedMs / 1000)) : 0;

      setBatchProgress((prev) => ({
        ...prev,
        elapsedMs,
        averageMsPerItem,
        estimatedRemainingMs,
        photosPerSecond,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [batchProgress.status, batchProgress.startTime, batchProgress.completed, batchProgress.total]);

  // Export Single Photo with customizable filename
  const handleExportSinglePhoto = useCallback(
    async (photoIndexToExport: number, customName?: string) => {
      const photo = photos[photoIndexToExport];
      if (!photo || !selectedFrame) return;

      setIsExportingSingle(true);
      try {
        const result = await exportSingleFramedPhoto(
          photo,
          selectedFrame.imageUrl,
          hole,
          settings,
          customName || photo.customExportName,
          selectedFrame.canvasWidth,
          selectedFrame.canvasHeight,
          selectedFrame.hasSolidCutout
        );

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: 'completed',
                  processedBlob: result.blob,
                  processedDataUrl: result.dataUrl,
                  customExportName: result.fileName,
                }
              : p
          )
        );

        showFitToast(`⚡ Exported "${result.fileName}" successfully!`);
      } catch (err: any) {
        console.error('Failed to export single photo:', err);
        alert(`Failed to export photo: ${err.message || 'Unknown error'}`);
      } finally {
        setIsExportingSingle(false);
      }
    },
    [photos, selectedFrame, hole, settings, showFitToast]
  );

  // Start Parallel Batch Framing
  const handleStartBatch = useCallback(async () => {
    if (!selectedFrame || photos.length === 0) return;

    const startTime = Date.now();
    setIsProcessing(true);
    setZipBlob(null);
    setBatchProgress({
      total: photos.length,
      completed: 0,
      status: 'running',
      startTime,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      averageMsPerItem: 0,
      photosPerSecond: 0,
    });

    try {
      const { zipBlob: generatedZip, processedPhotos } = await batchProcessPhotos(
        photos,
        selectedFrame.imageUrl,
        hole,
        settings,
        (completedCount, currentName) => {
          const now = Date.now();
          const elapsed = now - startTime;
          const remaining = photos.length - completedCount;
          const avgMs = completedCount > 0 ? elapsed / completedCount : 0;
          const estRemaining = remaining > 0 && completedCount > 0 ? remaining * avgMs : 0;
          const pps = elapsed > 0 ? (completedCount / (elapsed / 1000)) : 0;

          setBatchProgress({
            total: photos.length,
            completed: completedCount,
            currentItemName: currentName,
            status: 'running',
            startTime,
            elapsedMs: elapsed,
            estimatedRemainingMs: estRemaining,
            averageMsPerItem: avgMs,
            photosPerSecond: pps,
          });
        },
        selectedFrame.canvasWidth,
        selectedFrame.canvasHeight,
        selectedFrame.hasSolidCutout,
        namingSettings
      );

      const endTime = Date.now();
      const totalTimeMs = endTime - startTime;
      const avgMs = photos.length > 0 ? totalTimeMs / photos.length : 0;
      const pps = totalTimeMs > 0 ? (photos.length / (totalTimeMs / 1000)) : 0;

      setPhotos(processedPhotos);
      setZipBlob(generatedZip);
      setBatchProgress({
        total: photos.length,
        completed: photos.length,
        status: 'completed',
        startTime,
        elapsedMs: totalTimeMs,
        totalTimeMs,
        averageMsPerItem: avgMs,
        photosPerSecond: pps,
        estimatedRemainingMs: 0,
      });
    } catch (err) {
      console.error('Batch execution error:', err);
      setBatchProgress((prev) => ({ ...prev, status: 'error' }));
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFrame, photos, hole, settings, namingSettings]);

  // Download ZIP
  const handleDownloadZip = useCallback(() => {
    if (!zipBlob) return;
    let downloadName = (namingSettings.zipFileName || 'panpacific_framed_photos').trim();
    if (!downloadName.toLowerCase().endsWith('.zip')) {
      downloadName += '.zip';
    }
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [zipBlob, namingSettings.zipFileName]);

  const currentPhoto = photos[selectedPhotoIndex] || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0D0D10] text-zinc-100 font-sans overflow-hidden">
      {/* Top Navigation & Stats Bar */}
      <Header
        photoCount={photos.length}
        maxPhotos={MAX_PHOTOS}
        isProcessing={isProcessing}
        onClearAllPhotos={handleClearAllPhotos}
      />

      {/* Main 3-Column Studio Dashboard */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Panel: Lightroom Sliders & Presets & Cutout Geometry */}
        <LeftPanel
          settings={settings}
          onChangeSettings={setSettings}
          hole={hole}
          onChangeHole={setHole}
          onDetectHole={handleDetectHole}
          isDetectingHole={isDetectingHole}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          customPresets={customPresets}
          onSaveCustomPreset={handleSaveCustomPreset}
          onUpdateCustomPreset={handleUpdateCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          onImportPresets={handleImportPresets}
          onExportPresets={handleExportPresets}
          onAutoFit={handleAutoFit}
          autoFitOnUpload={autoFitOnUpload}
          onToggleAutoFitOnUpload={setAutoFitOnUpload}
          boxesMode={boxesMode}
          onToggleBoxesMode={handleToggleBoxesMode}
        />

        {/* Center Panel: Interactive Live Canvas Preview */}
        <CenterPreview
          currentPhoto={currentPhoto}
          photoIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          onSelectPhotoIndex={setSelectedPhotoIndex}
          frameTemplate={selectedFrame}
          hole={hole}
          settings={settings}
          onChangeSettings={(newSettings) => setSettings(newSettings)}
          batchProgress={batchProgress}
          isProcessing={isProcessing}
          onAutoFit={handleAutoFit}
          boxesMode={boxesMode}
          onToggleBoxesMode={handleToggleBoxesMode}
          onRenamePhoto={handleRenamePhoto}
          onExportSinglePhoto={handleExportSinglePhoto}
          isExportingSingle={isExportingSingle}
        />

        {/* Right Panel: Template Manager & 150-Photo Queue & Batch Action */}
        <RightPanel
          frames={frames}
          selectedFrame={selectedFrame}
          onSelectFrame={handleSelectFrame}
          onCustomFrameUpload={handleCustomFrameUpload}
          onRemoveFrame={handleRemoveFrame}
          onRestorePanpacificFrame={handleRestorePanpacificFrame}
          photos={photos}
          selectedPhotoIndex={selectedPhotoIndex}
          onSelectPhotoIndex={setSelectedPhotoIndex}
          onUploadPhotos={handleUploadPhotos}
          onRemovePhoto={handleRemovePhoto}
          onRenamePhoto={handleRenamePhoto}
          onClearAllPhotos={handleClearAllPhotos}
          maxPhotos={MAX_PHOTOS}
          batchProgress={batchProgress}
          onStartBatch={handleStartBatch}
          onDownloadZip={handleDownloadZip}
          zipBlob={zipBlob}
          isProcessing={isProcessing}
          boxesMode={boxesMode}
          onToggleBoxesMode={handleToggleBoxesMode}
          namingSettings={namingSettings}
          onChangeNamingSettings={setNamingSettings}
          onExportSinglePhoto={handleExportSinglePhoto}
        />
      </div>

      {/* Floating Auto-Fit Notification Toast */}
      {fitToastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-950/95 border border-indigo-500/50 text-indigo-100 text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>{fitToastMessage}</span>
        </div>
      )}
    </div>
  );
}
