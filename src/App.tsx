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
} from './types';
import {
  generateSampleFrames,
  generateSamplePhotos,
  DEFAULT_EDIT_SETTINGS,
} from './utils/sampleAssets';
import {
  detectTransparentHole,
  batchProcessPhotos,
} from './utils/imageProcessing';

export default function App() {
  const MAX_PHOTOS = 150;

  // Initial Sample Data
  const [frames, setFrames] = useState<FrameTemplate[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<FrameTemplate | null>(null);
  const [hole, setHole] = useState<HoleBoundingBox>({ x: 150, y: 150, width: 900, height: 600 });
  const [isDetectingHole, setIsDetectingHole] = useState(false);

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  const [settings, setSettings] = useState<EditSettings>(DEFAULT_EDIT_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('default');

  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    status: 'idle',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  // Initialize sample frames & photos on mount
  useEffect(() => {
    const sampleFrames = generateSampleFrames();
    setFrames(sampleFrames);
    if (sampleFrames.length > 0) {
      setSelectedFrame(sampleFrames[0]);
      setHole(sampleFrames[0].hole);
    }

    const initialPhotos = generateSamplePhotos(5);
    setPhotos(initialPhotos);
  }, []);

  // Handle PNG Frame Template Selection & Hole Auto-Detection
  const handleSelectFrame = useCallback(async (frame: FrameTemplate) => {
    setSelectedFrame(frame);
    setIsDetectingHole(true);

    try {
      const detection = await detectTransparentHole(frame.imageUrl);
      setHole(detection.hole);
    } catch (err) {
      console.error('Hole detection failed, using pre-configured hole:', err);
      setHole(frame.hole);
    } finally {
      setIsDetectingHole(false);
    }
  }, []);

  // Handle Custom PNG Frame Upload
  const handleCustomFrameUpload = useCallback(async (file: File) => {
    if (file.type !== 'image/png') {
      alert('Please upload a PNG image file with a transparent cutout window.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        setIsDetectingHole(true);
        try {
          const detection = await detectTransparentHole(dataUrl);
          const newFrame: FrameTemplate = {
            id: `custom_frame_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            description: 'Custom uploaded PNG template',
            category: 'Modern',
            imageUrl: dataUrl,
            hole: detection.hole,
            canvasWidth: img.width,
            canvasHeight: img.height,
            isCustom: true,
          };

          setFrames((prev) => [newFrame, ...prev]);
          setSelectedFrame(newFrame);
          setHole(detection.hole);
        } catch (err) {
          console.error('Error auto-detecting hole for custom upload:', err);
        } finally {
          setIsDetectingHole(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

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

  // Handle Photo Uploads (Max 150 limit)
  const handleUploadPhotos = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files);
      const remainingSlots = MAX_PHOTOS - photos.length;

      if (remainingSlots <= 0) {
        alert(`You have reached the maximum batch limit of ${MAX_PHOTOS} photos.`);
        return;
      }

      const filesToProcess = newFiles.slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
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
        };
        reader.readAsDataURL(file);
      });
    },
    [photos.length, MAX_PHOTOS]
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
        }
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
  }, [selectedFrame, photos, hole, settings]);

  // Download ZIP
  const handleDownloadZip = useCallback(() => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'framed_photos.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [zipBlob]);

  const currentPhoto = photos[selectedPhotoIndex] || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0D0D10] text-zinc-100 font-sans overflow-hidden">
      {/* Top Navigation & Stats Bar */}
      <Header
        photoCount={photos.length}
        maxPhotos={MAX_PHOTOS}
        isProcessing={isProcessing}
        onPopulateSamplePhotos={handlePopulateSamplePhotos}
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
        />

        {/* Center Panel: Interactive Live Canvas Preview */}
        {selectedFrame && (
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
          />
        )}

        {/* Right Panel: Template Manager & 150-Photo Queue & Batch Action */}
        {selectedFrame && (
          <RightPanel
            frames={frames}
            selectedFrame={selectedFrame}
            onSelectFrame={handleSelectFrame}
            onCustomFrameUpload={handleCustomFrameUpload}
            photos={photos}
            selectedPhotoIndex={selectedPhotoIndex}
            onSelectPhotoIndex={setSelectedPhotoIndex}
            onUploadPhotos={handleUploadPhotos}
            onRemovePhoto={handleRemovePhoto}
            onClearAllPhotos={handleClearAllPhotos}
            maxPhotos={MAX_PHOTOS}
            batchProgress={batchProgress}
            onStartBatch={handleStartBatch}
            onDownloadZip={handleDownloadZip}
            zipBlob={zipBlob}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </div>
  );
}
