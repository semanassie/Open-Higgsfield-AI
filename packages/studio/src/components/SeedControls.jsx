"use client";

import { randomSeed } from "./ModelBadges.jsx";

/**
 * Seed field + variation mode (new seed vs reuse).
 * Parent controls visibility via `visible` (typically modelSupportsSeed).
 *
 * @param {'new'|'reuse'} variationMode
 */
export default function SeedControls({
  visible,
  seed,
  onSeedChange,
  variationMode,
  onVariationModeChange,
  compact = false,
}) {
  if (!visible) return null;

  const roll = () => {
    const next = randomSeed();
    onSeedChange(next);
  };

  return (
    <div
      className={`flex flex-col gap-1.5 ${
        compact ? "min-w-[140px]" : "w-full max-w-xs"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
          Seed
        </label>
        <button
          type="button"
          title="Randomize seed"
          onClick={roll}
          className="text-xs leading-none px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-primary/20 text-primary border border-white/10 transition-colors"
          aria-label="Randomize seed"
        >
          🎲
        </button>
      </div>

      <input
        type="number"
        value={seed === undefined || seed === null || Number.isNaN(seed) ? "" : seed}
        placeholder="-1 (random)"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-") {
            onSeedChange(-1);
            return;
          }
          const n = parseInt(raw, 10);
          onSeedChange(Number.isFinite(n) ? n : -1);
        }}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
      />

      <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] rounded-lg border border-white/5">
        <button
          type="button"
          title="New variation — roll a fresh seed each generate"
          onClick={() => onVariationModeChange("new")}
          className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-md transition-colors ${
            variationMode === "new"
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-white/50 hover:text-white/80 border border-transparent"
          }`}
        >
          New seed
        </button>
        <button
          type="button"
          title="Reuse the seed value above"
          onClick={() => onVariationModeChange("reuse")}
          className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-md transition-colors ${
            variationMode === "reuse"
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-white/50 hover:text-white/80 border border-transparent"
          }`}
        >
          Reuse seed
        </button>
      </div>
    </div>
  );
}

/**
 * Resolve the seed to send for one generation attempt.
 * - new: always roll (and optionally report via onRolled)
 * - reuse: use current field value; -1 means omit/random API-side
 */
export function resolveGenerationSeed(variationMode, currentSeed, onRolled) {
  if (variationMode === "new") {
    const next = randomSeed();
    onRolled?.(next);
    return next;
  }
  const n = typeof currentSeed === "number" ? currentSeed : parseInt(currentSeed, 10);
  return Number.isFinite(n) ? n : -1;
}
