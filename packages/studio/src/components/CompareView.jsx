"use client";

/**
 * Side-by-side compare overlay for two history assets.
 */
export default function CompareView({
  left,
  right,
  onClose,
  onRemixLeft,
  onRemixRight,
}) {
  if (!left || !right) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-medium text-white">Compare</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/80 hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 min-h-0">
        <ComparePane asset={left} onRemix={onRemixLeft} label="A" />
        <ComparePane asset={right} onRemix={onRemixRight} label="B" />
      </div>
    </div>
  );
}

function ComparePane({ asset, onRemix, label }) {
  return (
    <div className="flex flex-col min-h-0 rounded-lg border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 text-[11px] text-white/50">
        <span>
          {label} · {asset.model || asset.type}
        </span>
        {onRemix && (
          <button
            type="button"
            onClick={onRemix}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-primary hover:text-black text-white/80"
          >
            Remix
          </button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center bg-black/40 min-h-[200px] p-2">
        {asset.type === "video" ? (
          <video
            src={asset.url}
            controls
            className="max-w-full max-h-[70vh] object-contain"
          />
        ) : asset.type === "audio" ? (
          <audio src={asset.url} controls className="w-full" />
        ) : (
          <img
            src={asset.url}
            alt={asset.prompt || "Compare"}
            className="max-w-full max-h-[70vh] object-contain"
          />
        )}
      </div>
      {asset.prompt ? (
        <p className="px-3 py-2 text-[11px] text-white/55 line-clamp-3 border-t border-white/5">
          {asset.prompt}
        </p>
      ) : null}
    </div>
  );
}
