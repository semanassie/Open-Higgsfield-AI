"use client";

import {
  MARKETING_PRESETS,
  expandMarketingPrompt,
  getMarketingPresetSeedPrompt,
} from "../lib/marketingPresets.js";

/**
 * Compact marketing workflow picker for ImageStudio.
 * Selection + Enhance are handled by parent via callbacks.
 */
export default function MarketingPresetPanel({
  activePresetId,
  onSelectPreset,
  onEnhancePrompt,
  onClearPreset,
  hasImage = false,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? "w-full"
          : "w-full max-w-3xl mx-auto"
      }
    >
      {!compact && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Marketing workflows
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Template → product image → enhance prompt → generate
            </p>
          </div>
          {activePresetId && (
            <button
              type="button"
              onClick={onClearPreset}
              className="text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div
        className={
          compact
            ? "flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1"
            : "grid grid-cols-1 sm:grid-cols-3 gap-3"
        }
      >
        {MARKETING_PRESETS.map((preset) => {
          const active = activePresetId === preset.id;
          const needsImage = preset.requiresImage && !hasImage;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={
                compact
                  ? `shrink-0 flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-all ${
                      active
                        ? "border-primary/50 bg-primary/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06]"
                    }`
                  : `relative flex flex-col gap-2 p-4 rounded-lg border text-left transition-all ${
                      active
                        ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/5"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    active ? "text-primary" : "text-white/90"
                  }`}
                >
                  {compact ? preset.shortLabel : preset.name}
                </span>
                <span className="text-[10px] font-mono text-white/35">
                  {preset.aspectRatio}
                </span>
              </div>
              {!compact && (
                <>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    {preset.description}
                  </p>
                  {needsImage && (
                    <span className="text-[10px] font-medium text-amber-300/80">
                      Upload a product image to continue
                    </span>
                  )}
                  {active && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Active
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {activePresetId && (
        <div
          className={
            compact
              ? "mt-2 flex flex-wrap items-center gap-2"
              : "mt-3 flex flex-wrap items-center gap-2"
          }
        >
          <button
            type="button"
            onClick={onEnhancePrompt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-white/[0.06] hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-white/80 hover:text-primary transition-all"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" />
            </svg>
            Enhance prompt
          </button>
          {compact && onClearPreset && (
            <button
              type="button"
              onClick={onClearPreset}
              className="text-[10px] font-semibold uppercase tracking-wider text-white/35 hover:text-white/70 transition-colors px-1"
            >
              Clear preset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { expandMarketingPrompt, getMarketingPresetSeedPrompt, MARKETING_PRESETS };
