import React, { useState, useEffect } from 'react';
import { Sparkles, X, Palette, Check, Sliders, Info } from 'lucide-react';
import { EditSettings } from '../types';
import { PRESET_COLOR_PALETTE } from '../utils/presets';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; description?: string }) => void;
  initialData?: { name: string; color: string; description?: string; id?: string } | null;
  currentSettings: EditSettings;
  mode?: 'create' | 'edit';
}

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentSettings,
  mode = 'create',
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setColor(initialData.color || '#6366F1');
        setDescription(initialData.description || '');
      } else {
        setName(`Custom Look ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        setColor(PRESET_COLOR_PALETTE[Math.floor(Math.random() * PRESET_COLOR_PALETTE.length)]);
        setDescription('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color,
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#141419] border border-[#2c2c38] rounded-2xl w-full max-w-md shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#242430] flex items-center justify-between bg-[#111116]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow"
              style={{ backgroundColor: color }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {mode === 'edit' ? 'Edit Custom Preset' : 'Save as Custom Preset'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {mode === 'edit'
                  ? 'Update your preset name and color identity'
                  : 'Save current Lightroom adjustments as a 1-click look'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Preset Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Preset Name</span>
              <span className="text-[10px] text-zinc-500 font-mono">Max 30 chars</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Warm Golden Glow, Ceremony High-Pop"
              className="w-full bg-[#0D0D11] border border-[#2a2a36] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition"
            />
          </div>

          {/* Preset Color Swatch Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Accent Swatch Color</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLOR_PALETTE.map((palColor) => (
                <button
                  key={palColor}
                  type="button"
                  onClick={() => setColor(palColor)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center relative ${
                    color === palColor ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#141419]' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: palColor }}
                >
                  {color === palColor && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Description / Notes (Optional)</span>
              <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
            </label>
            <input
              type="text"
              maxLength={60}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Ideal for outdoor ceremonies with harsh sunlight"
              className="w-full bg-[#0D0D11] border border-[#2a2a36] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition"
            />
          </div>

          {/* Snapshot of Settings Being Saved */}
          <div className="bg-[#0C0C10] p-3 rounded-xl border border-[#22222c] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Snapshot Values:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">5 Color & Tone Adjustments</span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center font-mono">
              <div className="bg-[#14141A] p-1.5 rounded-lg border border-[#22222e]">
                <div className="text-[9px] text-zinc-500">Exp</div>
                <div className={`text-xs font-bold ${currentSettings.exposure !== 0 ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {currentSettings.exposure > 0 ? `+${currentSettings.exposure}` : currentSettings.exposure}
                </div>
              </div>

              <div className="bg-[#14141A] p-1.5 rounded-lg border border-[#22222e]">
                <div className="text-[9px] text-zinc-500">Cont</div>
                <div className={`text-xs font-bold ${currentSettings.contrast !== 0 ? 'text-indigo-300' : 'text-zinc-400'}`}>
                  {currentSettings.contrast > 0 ? `+${currentSettings.contrast}` : currentSettings.contrast}
                </div>
              </div>

              <div className="bg-[#14141A] p-1.5 rounded-lg border border-[#22222e]">
                <div className="text-[9px] text-zinc-500">Sat</div>
                <div className={`text-xs font-bold ${currentSettings.saturation !== 0 ? 'text-rose-300' : 'text-zinc-400'}`}>
                  {currentSettings.saturation > 0 ? `+${currentSettings.saturation}` : currentSettings.saturation}
                </div>
              </div>

              <div className="bg-[#14141A] p-1.5 rounded-lg border border-[#22222e]">
                <div className="text-[9px] text-zinc-500">Sharp</div>
                <div className={`text-xs font-bold ${currentSettings.sharpness !== 0 ? 'text-cyan-300' : 'text-zinc-400'}`}>
                  {currentSettings.sharpness > 0 ? `+${currentSettings.sharpness}` : currentSettings.sharpness}
                </div>
              </div>

              <div className="bg-[#14141A] p-1.5 rounded-lg border border-[#22222e]">
                <div className="text-[9px] text-zinc-500">Temp</div>
                <div className={`text-xs font-bold ${currentSettings.temperature !== 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {currentSettings.temperature > 0 ? `+${currentSettings.temperature}` : currentSettings.temperature}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{mode === 'edit' ? 'Update Preset' : 'Save Custom Preset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
