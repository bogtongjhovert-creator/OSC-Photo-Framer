import React, { useState } from 'react';
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
} from 'lucide-react';
import { EditSettings, HoleBoundingBox, Preset } from '../types';
import { LIGHTROOM_PRESETS } from '../utils/presets';
import { DEFAULT_EDIT_SETTINGS } from '../utils/sampleAssets';

interface LeftPanelProps {
  settings: EditSettings;
  onChangeSettings: (newSettings: EditSettings) => void;
  hole: HoleBoundingBox;
  onChangeHole: (newHole: HoleBoundingBox) => void;
  onDetectHole: () => void;
  isDetectingHole: boolean;
  activePresetId: string;
  onSelectPreset: (preset: Preset) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'lightroom' | 'hole_geometry'>('lightroom');
  const [isHoleExpanded, setIsHoleExpanded] = useState(false);
  const [nudgeStep, setNudgeStep] = useState<number>(10);

  const handleSliderChange = (key: keyof EditSettings, value: number | string) => {
    onChangeSettings({
      ...settings,
      [key]: value,
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

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-[#111115] border-r border-[#22222a] flex flex-col h-full overflow-hidden select-none">
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
            {/* Lightroom Presets Bar */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Lightroom Presets
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">1-Click Look</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {LIGHTROOM_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectPreset(preset)}
                      className={`p-2 rounded-lg border text-left transition relative overflow-hidden flex flex-col justify-between h-16 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-md shadow-indigo-950/40'
                          : 'border-[#262630] bg-[#17171D] hover:border-zinc-700 text-zinc-300 hover:bg-[#1D1D24]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: preset.previewColor }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <span className="text-[11px] font-semibold tracking-tight truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#22222a]" />

            {/* Sliders Group Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Color &amp; Tone Sliders
              </span>

              <button
                onClick={handleResetAll}
                className="text-xs text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 px-2 py-1 rounded transition flex items-center gap-1 font-medium"
                title="Reset Edits to Default"
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
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.exposure > 0 ? `+${settings.exposure}` : settings.exposure}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.exposure}
                  onChange={(e) => handleSliderChange('exposure', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}
                  </span>
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
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.saturation}
                  onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.sharpness > 0 ? `+${settings.sharpness}` : settings.sharpness}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={settings.sharpness}
                  onChange={(e) => handleSliderChange('sharpness', Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                  <span className="font-mono font-bold text-indigo-300">
                    {settings.temperature > 0 ? `+${settings.temperature}` : settings.temperature}
                  </span>
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
                    onClick={() => handleSliderChange('fitMode', mode as any)}
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
    </div>
  );
};
