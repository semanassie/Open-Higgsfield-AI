"use client";

/** Known feature badges — colors stay stable across pickers */
const BADGE_STYLES = {
  New: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Fast: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "4K": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Audio: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const BEST_FOR_LABELS = {
  draft: "Best for: draft",
  final: "Best for: final",
  speed: "Best for: speed",
  quality: "Best for: quality",
};

/**
 * Renders catalog `badges` chips (+ optional `bestFor` as title/tooltip).
 * No-op when W6 has not yet added meta on the model entry.
 */
export default function ModelBadges({ badges, bestFor, className = "" }) {
  const list = Array.isArray(badges) ? badges.filter(Boolean) : [];
  if (list.length === 0 && !bestFor) return null;

  const title = bestFor
    ? BEST_FOR_LABELS[bestFor] || `Best for: ${bestFor}`
    : undefined;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${className}`}
      title={title}
    >
      {list.map((badge) => (
        <span
          key={badge}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
            BADGE_STYLES[badge] ||
            "bg-white/10 text-white/70 border-white/15"
          }`}
        >
          {badge}
        </span>
      ))}
      {bestFor && list.length === 0 && (
        <span className="text-[9px] text-white/40 font-medium">{title}</span>
      )}
    </div>
  );
}

/** True when model catalog exposes a seed input schema (W6 / MuAPI). */
export function modelSupportsSeed(model) {
  return Boolean(model?.inputs?.seed);
}

export function randomSeed(max = 999_999_999) {
  return Math.floor(Math.random() * max);
}
