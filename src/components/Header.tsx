import React from 'react';
import { Image, Layers, Sparkles, Trash2, Cpu, FileArchive } from 'lucide-react';

interface HeaderProps {
  photoCount: number;
  maxPhotos: number;
  isProcessing: boolean;
  onPopulateSamplePhotos: (count: number) => void;
  onClearAllPhotos: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  maxPhotos,
  isProcessing,
  onPopulateSamplePhotos,
  onClearAllPhotos,
}) => {
  return (
    <header className="bg-[#0D0D10] border-b border-[#22222a] px-6 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-950/40 flex items-center justify-center">
          <div className="w-full h-full bg-[#111116] rounded-[10px] flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-wide">
              AutoFrame <span className="text-indigo-400">Studio Pro</span>
            </h1>
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              150-Batch Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Batch PNG Hole Fitting &amp; Lightroom Aesthetics Engine
          </p>
        </div>
      </div>

      {/* Center Stats & Populator */}
      <div className="hidden md:flex items-center gap-3 bg-[#16161C] px-3.5 py-1.5 rounded-xl border border-[#282832]">
        <div className="flex items-center gap-2 text-xs">
          <Image className="w-4 h-4 text-indigo-400" />
          <span className="text-zinc-300 font-medium">Batch Queue:</span>
          <span
            className={`font-mono font-bold ${
              photoCount >= maxPhotos ? 'text-amber-400' : 'text-indigo-300'
            }`}
          >
            {photoCount} / {maxPhotos}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-zinc-700/60" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">Sample Load:</span>
          <button
            onClick={() => onPopulateSamplePhotos(5)}
            disabled={isProcessing || photoCount >= maxPhotos}
            className="text-xs bg-[#202028] hover:bg-[#282832] text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition font-medium disabled:opacity-40"
          >
            +5
          </button>
          <button
            onClick={() => onPopulateSamplePhotos(25)}
            disabled={isProcessing || photoCount >= maxPhotos}
            className="text-xs bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-800/60 transition font-medium disabled:opacity-40"
          >
            +25
          </button>
          <button
            onClick={() => onPopulateSamplePhotos(150)}
            disabled={isProcessing || photoCount >= maxPhotos}
            className="text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-2.5 py-1 rounded-lg transition font-medium shadow-sm shadow-indigo-950/50 disabled:opacity-40"
          >
            Fill 150
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-[#14141A] px-3 py-1.5 rounded-lg border border-[#24242e]">
          <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>LANCZOS Resampling</span>
        </div>

        {photoCount > 0 && (
          <button
            onClick={onClearAllPhotos}
            disabled={isProcessing}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition disabled:opacity-40 font-medium"
            title="Clear all photos from queue"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>
        )}
      </div>
    </header>
  );
};

