import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface ZoomControlsProps {
  scale: number;
  minScale: number;
  maxScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function ZoomControls({
  scale,
  minScale,
  maxScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ZoomControlsProps) {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white/90 px-1 py-0.5 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={scale <= minScale}
        className="rounded p-1.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>
      <span className="min-w-[40px] select-none text-center text-xs font-medium tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        className="rounded p-1.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-gray-300" />
      <button
        type="button"
        onClick={onZoomReset}
        disabled={scale === 1}
        className="rounded p-1.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        title="Reset zoom"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
