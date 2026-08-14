import React, { useState, useRef } from 'react';
import {
  Sliders,
  RotateCcw,
  Sun,
  Contrast,
  Palette,
  Zap,
  Thermometer,
  Sparkles,
  Maximize2,
  Move,
  Scan,
  Check,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Focus,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  Upload,
  Layers,
  FolderPlus,
} from 'lucide-react';
import { EditSettings, HoleBoundingBox, Preset } from '../types';
import { BUILT_IN_PRESETS, parseImportedPresetsJson } from '../utils/presets';
import { DEFAULT_EDIT_SETTINGS } from '../utils/sampleAssets';
import { PresetModal } from './PresetModal';

interface LeftPanelProps {
  settings: EditSettings;
  onChangeSettings: (newSettings: EditSettings) => void;
  hole: HoleBoundingBox;
  onChangeHole: (newHole: HoleBoundingBox) => void;
  onDetectHole: () => void;
  isDetectingHole: boolean;
  activePresetId: string;
  onSelectPreset: (preset: Preset) => void;
  customPresets: Preset[];
  onSaveCustomPreset: (name: string, color: string, description?: string) => void;
  onUpdateCustomPreset: (presetId: string, name?: string, color?: string, description?: string) => void;
  onDeleteCustomPreset: (presetId: string) => void;
  onImportPresets: (presets: Preset[]) => void;
  onExportPresets: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  settings,
  onChangeSettings,
  hole,
  onChangeHole,
  onDetectHole,
  isDetectingHole,
  activePresetId,
  onSelectPreset,
  customPresets,
  onSaveCustomPreset,
  onUpdateCustomPreset,
  onDeleteCustomPreset,
  onImportPresets,
  onExportPresets,
}) => {
  const [activeTab, setActiveTab] = useState<'lightroom' | 'hole_geometry'>('lightroom');
  const [presetFilter, setPresetFilter] = useState<'all' | 'builtin' | 'custom'>('all');
  const [isHoleExpanded, setIsHoleExpanded] = useState(false);
  const [nudgeStep, setNudgeStep] = useState<number>(10);

  // Preset Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  // Import file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSliderChange = (key: keyof EditSettings, value: number | string) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleResetSlider = (key: keyof EditSettings, defaultValue: number = 0) => {
    onChangeSettings({
      ...settings,
      [key]: defaultValue,
    });
  };

  const handleResetAll = () => {
    onChangeSettings(DEFAULT_EDIT_SETTINGS);
  };

  // Nudge direction functions
  const nudgeUp = (step = nudgeStep) => {
    onChangeSettings({ ...settings, offsetY: settings.offsetY - step });
  };
  const nudgeDown = (step = nudgeStep) => {
    onChangeSettings({ ...settings, offsetY: settings.offsetY + step });
  };
  const nudgeLeft = (step = nudgeStep) => {
    onChangeSettings({ ...settings, offsetX: settings.offsetX - step });
  };
  const nudgeRight = (step = nudgeStep) => {
    onChangeSettings({ ...settings, offsetX: settings.offsetX + step });
  };
  const resetPositionAndScale = () => {
    onChangeSettings({ ...settings, scale: 1.0, offsetX: 0, offsetY: 0 });
  };

  // Combine built-in & custom presets
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const displayedPresets = allPresets.filter((preset) => {
    if (presetFilter === 'builtin') return !preset.isCustom;
    if (presetFilter === 'custom') return preset.isCustom;
    return true;
  });

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setEditingPreset(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (preset: Preset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPreset(preset);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle save from modal
  const handleModalSave = (data: { name: string; color: string; description?: string }) => {
    if (modalMode === 'create') {
      onSaveCustomPreset(data.name, data.color, data.description);
    } else if (editingPreset) {
      onUpdateCustomPreset(editingPreset.id, data.name, data.color, data.description);
    }
  };

  // Quick 1-click update active custom preset with current sliders
  const handleQuickUpdateActivePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateCustomPreset(presetId);
  };

  // Handle JSON Import
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = parseImportedPresetsJson(content);
        if (imported.length > 0) {
          onImportPresets(imported);
          alert(`Successfully imported ${imported.length} custom preset(s)!`);
        } else {
          alert('No valid presets found in this file.');
        }
      } catch (err: any) {
        alert(err.message || 'Failed to import preset file.');
      }
    };
    reader.readAsText(file);

    // Reset input
    if (e.target) e.target.value = '';
  };

  // Find currently active preset object
  const currentActivePreset = allPresets.find((p) => p.id === activePresetId);

  // Check if current settings differ from active preset settings
  const isSettingsModifiedFromPreset = (() => {
    if (!currentActivePreset || !currentActivePreset.settings) return false;
    const ps = currentActivePreset.settings;
    return (
      (ps.exposure !== undefined && ps.exposure !== settings.exposure) ||
      (ps.contrast !== undefined && ps.contrast !== settings.contrast) ||
      (ps.saturation !== undefined && ps.saturation !== settings.saturation) ||
      (ps.sharpness !== undefined && ps.sharpness !== settings.sharpness) ||
      (ps.temperature !== undefined && ps.temperature !== settings.temperature)
    );
  })();

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-[#111115] border-r border-[#22222a] flex flex-col h-full overflow-hidden select-none">
      {/* Hidden File Input for Importing Presets */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFileChange}
      />

      {/* Panel Navigation Tabs */}
      <div className="flex border-b border-[#22222a] bg-[#0E0E11]">
        <button
          onClick={() => setActiveTab('lightroom')}
          className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === 'lightroom'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Lightroom Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('hole_geometry')}
          className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === 'hole_geometry'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Window Cutout</span>
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {activeTab === 'lightroom' ? (
          <>
            {/* Lightroom Presets Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Lightroom Presets
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Save as Preset Button */}
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 shadow-sm shadow-indigo-950/40"
                    title="Save current sliders as a custom preset"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Save Preset</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Import/Export Bar */}
              <div className="flex items-center justify-between gap-1 pt-1 pb-0.5">
                <div className="flex items-center bg-[#181820] p-0.5 rounded-lg border border-[#262632]">
                  <button
                    onClick={() => setPresetFilter('all')}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      presetFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({allPresets.length})
                  </button>
                  <button
                    onClick={() => setPresetFilter('builtin')}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      presetFilter === 'builtin'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Built-in
                  </button>
                  <button
                    onClick={() => setPresetFilter('custom')}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                      presetFilter === 'custom'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Custom</span>
                    {customPresets.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 text-[9px] flex items-center justify-center font-bold">
                        {customPresets.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Import / Export icons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg bg-[#181820] hover:bg-[#22222c] text-zinc-400 hover:text-zinc-200 border border-[#282834] transition"
                    title="Import Presets (.json)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onExportPresets}
                    disabled={customPresets.length === 0}
                    className="p-1.5 rounded-lg bg-[#181820] hover:bg-[#22222c] text-zinc-400 hover:text-zinc-200 border border-[#282834] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export Custom Presets (.json)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Modified Notice Bar (if user adjusted sliders while a preset is active) */}
              {isSettingsModifiedFromPreset && (
                <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-medium truncate">
                    Sliders tweaked from &ldquo;{currentActivePreset?.name}&rdquo;
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentActivePreset?.isCustom ? (
                      <button
                        onClick={(e) => handleQuickUpdateActivePreset(currentActivePreset.id, e)}
                        className="text-[10px] font-bold text-amber-400 hover:text-white bg-amber-500/20 hover:bg-amber-600 px-2 py-0.5 rounded transition flex items-center gap-1"
                        title="Update this custom preset with current sliders"
                      >
                        <Save className="w-2.5 h-2.5" />
                        <span>Update</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenCreateModal}
                        className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-600 px-2 py-0.5 rounded transition flex items-center gap-1"
                        title="Save as new custom preset"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Save as New</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                {displayedPresets.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => onSelectPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer group flex flex-col justify-between min-h-[72px] ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                          : 'border-[#262630] bg-[#16161D] hover:border-zinc-700 text-zinc-300 hover:bg-[#1C1C24]'
                      }`}
                    >
                      {/* Top Row: Swatch & Actions */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: preset.previewColor }}
                          />
                          {preset.isCustom && (
                            <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded border border-indigo-500/30">
                              Custom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}

                          {/* Actions for Custom Presets */}
                          {preset.isCustom && (
                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={(e) => handleOpenEditModal(preset, e)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition"
                                title="Edit Preset Name & Color"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete custom preset "${preset.name}"?`)) {
                                    onDeleteCustomPreset(preset.id);
                                  }
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete Custom Preset"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Name & Quick Values */}
                      <div className="pt-1.5">
                        <div className="text-xs font-semibold tracking-tight truncate">
                          {preset.name}
                        </div>
                        {preset.description && (
                          <div className="text-[10px] text-zinc-500 truncate">
                            {preset.description}
                          </div>
                        )}
                        <div className="text-[9px] text-zinc-500 font-mono flex items-center gap-1.5 pt-0.5">
                          <span>E:{preset.settings.exposure ?? 0}</span>
                          <span>C:{preset.settings.contrast ?? 0}</span>
                          <span>S:{preset.settings.saturation ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {displayedPresets.length === 0 && (
                <div className="py-6 text-center text-zinc-500 bg-[#16161D] rounded-xl border border-[#242430] p-4 space-y-2">
                  <FolderPlus className="w-6 h-6 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-medium">No custom presets saved yet</p>
                  <p className="text-[11px] text-zinc-500">
                    Adjust the sliders below and click &ldquo;Save Preset&rdquo; to create your first look!
                  </p>
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Preset</span>
                  </button>
                </div>
              )}
            </div>

            <hr className="border-[#22222a]" />

            {/* Sliders Group Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Color &amp; Tone Sliders
              </span>

              <button
                onClick={handleResetAll}
                className="text-xs text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 px-2 py-1 rounded transition flex items-center gap-1 font-medium"
                title="Reset All Edits to Default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>

            {/* Individual Adjustment Sliders */}
            <div className="space-y-3.5">
              {/* Exposure Slider */}
              <div className="bg-[#16161C] p-3 rounded-xl border border-[#262630] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exposure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetSlider('exposure', 0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        settings.exposure !== 0
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'text-zinc-500 opacity-50'
                      }`}
                      title="Reset Exposure to 0"
                    >
                      0
                    </button>
                    <span className="font-mono font-bold text-amber-300 min-w-[32px] text-right">
                      {settings.exposure > 0 ? `+${settings.exposure}` : settings.exposure}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.exposure}
                  onChange={(e) => handleSliderChange('exposure', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>-100 Dark</span>
                  <span>0 Default</span>
                  <span>+100 Bright</span>
                </div>
              </div>

              {/* Contrast Slider */}
              <div className="bg-[#16161C] p-3 rounded-xl border border-[#262630] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <Contrast className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Contrast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetSlider('contrast', 0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        settings.contrast !== 0
                          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                          : 'text-zinc-500 opacity-50'
                      }`}
                      title="Reset Contrast to 0"
                    >
                      0
                    </button>
                    <span className="font-mono font-bold text-indigo-300 min-w-[32px] text-right">
                      {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.contrast}
                  onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>-100 Soft</span>
                  <span>0 Default</span>
                  <span>+100 Punchy</span>
                </div>
              </div>

              {/* Saturation Slider */}
              <div className="bg-[#16161C] p-3 rounded-xl border border-[#262630] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <Palette className="w-3.5 h-3.5 text-rose-400" />
                    <span>Saturation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetSlider('saturation', 0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        settings.saturation !== 0
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                          : 'text-zinc-500 opacity-50'
                      }`}
                      title="Reset Saturation to 0"
                    >
                      0
                    </button>
                    <span className="font-mono font-bold text-rose-300 min-w-[32px] text-right">
                      {settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.saturation}
                  onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>-100 B&amp;W</span>
                  <span>0 Natural</span>
                  <span>+100 Vivid</span>
                </div>
              </div>

              {/* Sharpness Slider */}
              <div className="bg-[#16161C] p-3 rounded-xl border border-[#262630] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sharpness</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetSlider('sharpness', 0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        settings.sharpness !== 0
                          ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                          : 'text-zinc-500 opacity-50'
                      }`}
                      title="Reset Sharpness to 0"
                    >
                      0
                    </button>
                    <span className="font-mono font-bold text-cyan-300 min-w-[32px] text-right">
                      {settings.sharpness > 0 ? `+${settings.sharpness}` : settings.sharpness}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.sharpness}
                  onChange={(e) => handleSliderChange('sharpness', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>-100 Smooth</span>
                  <span>0 Default</span>
                  <span>+100 Crisp</span>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="bg-[#16161C] p-3 rounded-xl border border-[#262630] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Temperature</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetSlider('temperature', 0)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                        settings.temperature !== 0
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'text-zinc-500 opacity-50'
                      }`}
                      title="Reset Temperature to 0"
                    >
                      0
                    </button>
                    <span className="font-mono font-bold text-amber-300 min-w-[32px] text-right">
                      {settings.temperature > 0 ? `+${settings.temperature}` : settings.temperature}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.temperature}
                  onChange={(e) => handleSliderChange('temperature', Number(e.target.value))}
                  className="w-full h-1.5 bg-gradient-to-r from-blue-500 via-zinc-600 to-amber-500 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Cool Blue</span>
                  <span>Neutral</span>
                  <span>Warm Gold</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Hole Geometry & Positioning Tab */
          <div className="space-y-5">
            {/* Auto Detection Card */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/30 p-4 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">PNG Hole Auto-Detection</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  Alpha Scanner
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Scans the frame&apos;s alpha channel to calculate the exact transparent window bounding
                box <code className="text-indigo-300">(x, y, w, h)</code> automatically.
              </p>
              <button
                onClick={onDetectHole}
                disabled={isDetectingHole}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Scan className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{isDetectingHole ? 'Scanning Alpha Channel...' : 'Re-Detect Cutout Window'}</span>
              </button>
            </div>

            {/* Fit Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>ImageOps Fit Mode</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cover', 'contain', 'fill'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleSliderChange('fitMode', mode)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${
                      settings.fitMode === mode
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                        : 'border-[#262630] bg-[#16161C] text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Scale & Positioning Control Suite */}
            <div className="space-y-4 bg-[#16161C] p-3.5 rounded-xl border border-[#262630]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-indigo-400" />
                  Position &amp; Scale inside Window
                </span>
                <button
                  onClick={resetPositionAndScale}
                  className="text-[10px] text-zinc-400 hover:text-indigo-300 bg-zinc-800/80 hover:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/60 transition flex items-center gap-1"
                  title="Reset Position & Zoom Scale"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Zoom Scale Controls */}
              <div className="space-y-2 bg-[#101015] p-2.5 rounded-lg border border-[#242430]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                    Zoom Scale
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSliderChange('scale', Math.max(0.2, Number((settings.scale - 0.1).toFixed(2))))}
                      className="p-1 rounded bg-[#1A1A22] hover:bg-[#242430] text-zinc-300 border border-[#282836] transition"
                      title="Zoom Out (-10%)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-indigo-300 min-w-[45px] text-center">
                      {(settings.scale * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => handleSliderChange('scale', Math.min(3.5, Number((settings.scale + 0.1).toFixed(2))))}
                      className="p-1 rounded bg-[#1A1A22] hover:bg-[#242430] text-zinc-300 border border-[#282836] transition"
                      title="Zoom In (+10%)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.05"
                  value={settings.scale}
                  onChange={(e) => handleSliderChange('scale', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />

                {/* Quick Zoom Preset Buttons */}
                <div className="grid grid-cols-6 gap-1 pt-0.5">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSliderChange('scale', s)}
                      className={`py-1 rounded text-[10px] font-mono font-bold transition border ${
                        Math.abs(settings.scale - s) < 0.02
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-[#181820] text-zinc-400 border-[#282832] hover:text-zinc-200'
                      }`}
                    >
                      {Math.round(s * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Directional Pad (D-Pad) for Left, Right, Up/Top, Down/Bottom */}
              <div className="space-y-2 bg-[#101015] p-2.5 rounded-lg border border-[#242430]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">4-Way Directional Nudge</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Step:</span>
                    {[1, 10, 25, 50].map((step) => (
                      <button
                        key={step}
                        onClick={() => setNudgeStep(step)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                          nudgeStep === step
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-[#181820] text-zinc-400 border-[#282832] hover:text-zinc-200'
                        }`}
                      >
                        {step}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3x3 D-Pad Control Grid */}
                <div className="flex flex-col items-center gap-1.5 py-1">
                  {/* Top Button */}
                  <button
                    onClick={() => nudgeUp()}
                    className="w-24 py-1.5 rounded-lg bg-[#1E1E28] hover:bg-indigo-600 hover:text-white text-zinc-200 border border-[#282838] transition flex items-center justify-center gap-1 text-xs font-semibold shadow-sm"
                    title={`Move Photo UP (Top) by -${nudgeStep}px`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Top</span>
                  </button>

                  {/* Middle Row: Left, Center, Right */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => nudgeLeft()}
                      className="w-20 py-1.5 rounded-lg bg-[#1E1E28] hover:bg-indigo-600 hover:text-white text-zinc-200 border border-[#282838] transition flex items-center justify-center gap-1 text-xs font-semibold shadow-sm"
                      title={`Move Photo LEFT by -${nudgeStep}px`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Left</span>
                    </button>

                    <button
                      onClick={() => onChangeSettings({ ...settings, offsetX: 0, offsetY: 0 })}
                      className="w-16 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60 transition flex items-center justify-center gap-1 text-xs font-bold"
                      title="Reset Offset to Center (0, 0)"
                    >
                      <Focus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>0,0</span>
                    </button>

                    <button
                      onClick={() => nudgeRight()}
                      className="w-20 py-1.5 rounded-lg bg-[#1E1E28] hover:bg-indigo-600 hover:text-white text-zinc-200 border border-[#282838] transition flex items-center justify-center gap-1 text-xs font-semibold shadow-sm"
                      title={`Move Photo RIGHT by +${nudgeStep}px`}
                    >
                      <span>Right</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Button */}
                  <button
                    onClick={() => nudgeDown()}
                    className="w-24 py-1.5 rounded-lg bg-[#1E1E28] hover:bg-indigo-600 hover:text-white text-zinc-200 border border-[#282838] transition flex items-center justify-center gap-1 text-xs font-semibold shadow-sm"
                    title={`Move Photo DOWN (Bottom) by +${nudgeStep}px`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Bottom</span>
                  </button>
                </div>
              </div>

              {/* Fine Offset X Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Horizontal Pan (X)</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.offsetX > 0 ? `+${settings.offsetX}` : settings.offsetX}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={settings.offsetX}
                  onChange={(e) => handleSliderChange('offsetX', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Fine Offset Y Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Vertical Pan (Y)</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.offsetY > 0 ? `+${settings.offsetY}` : settings.offsetY}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={settings.offsetY}
                  onChange={(e) => handleSliderChange('offsetY', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Corner Radius */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Cutout Corner Radius</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.cornerRadius}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={settings.cornerRadius}
                  onChange={(e) => handleSliderChange('cornerRadius', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Manual Coordinate Overrides */}
            <div className="bg-[#16161C] border border-[#262630] rounded-xl overflow-hidden">
              <button
                onClick={() => setIsHoleExpanded(!isHoleExpanded)}
                className="w-full p-3 flex items-center justify-between text-xs font-bold text-zinc-300 hover:bg-zinc-800/40 transition"
              >
                <span>Manual Bounding Box Coordinates</span>
                {isHoleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isHoleExpanded && (
                <div className="p-3 border-t border-[#262630] grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono">X Offset</label>
                    <input
                      type="number"
                      value={hole.x}
                      onChange={(e) => onChangeHole({ ...hole, x: Number(e.target.value) })}
                      className="w-full bg-[#111116] border border-zinc-700/80 rounded px-2 py-1 text-xs font-mono text-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono">Y Offset</label>
                    <input
                      type="number"
                      value={hole.y}
                      onChange={(e) => onChangeHole({ ...hole, y: Number(e.target.value) })}
                      className="w-full bg-[#111116] border border-zinc-700/80 rounded px-2 py-1 text-xs font-mono text-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono">Width (W)</label>
                    <input
                      type="number"
                      value={hole.width}
                      onChange={(e) => onChangeHole({ ...hole, width: Number(e.target.value) })}
                      className="w-full bg-[#111116] border border-zinc-700/80 rounded px-2 py-1 text-xs font-mono text-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono">Height (H)</label>
                    <input
                      type="number"
                      value={hole.height}
                      onChange={(e) => onChangeHole({ ...hole, height: Number(e.target.value) })}
                      className="w-full bg-[#111116] border border-zinc-700/80 rounded px-2 py-1 text-xs font-mono text-indigo-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preset Create / Edit Modal */}
      <PresetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        initialData={
          editingPreset
            ? {
                name: editingPreset.name,
                color: editingPreset.previewColor,
                description: editingPreset.description,
                id: editingPreset.id,
              }
            : null
        }
        currentSettings={settings}
        mode={modalMode}
      />
    </div>
  );
};
