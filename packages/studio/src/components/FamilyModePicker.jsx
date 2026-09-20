"use client";

import { useMemo, useState } from "react";
import {
  VIDEO_FAMILY_PRIORITY,
  IMAGE_FAMILY_PRIORITY,
  getFamilies,
  filterFamiliesBySearch,
  findFamilyForModel,
  resolveVariant,
  getFamilyDisplayName,
} from "../modelFamilies.js";
import ModelBadges from "./ModelBadges.jsx";

const CheckSvg = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="4"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function accentClass(accent, familyId) {
  if (accent === "orange") return "bg-orange-500/10 text-orange-400";
  const id = (familyId || "").toLowerCase();
  if (id.includes("kling")) return "bg-blue-500/10 text-blue-400";
  if (id.includes("veo")) return "bg-purple-500/10 text-purple-400";
  if (id.includes("sora")) return "bg-rose-500/10 text-rose-400";
  if (id.includes("flux")) return "bg-amber-500/10 text-amber-400";
  if (id.includes("seedance") || id.includes("bytedance"))
    return "bg-emerald-500/10 text-emerald-400";
  if (id.includes("wan")) return "bg-sky-500/10 text-sky-400";
  if (id.includes("minimax") || id.includes("hailuo"))
    return "bg-fuchsia-500/10 text-fuchsia-400";
  if (id.includes("kontext")) return "bg-blue-500/10 text-blue-400";
  if (id.includes("effects")) return "bg-purple-500/10 text-purple-400";
  return "bg-primary/10 text-primary";
}

/**
 * Mode chips — Standard / Fast / 1080p / 4K / Prime / Max…
 * Renders whenever family has 2+ modes (sidebar + picker expand).
 */
export function ModeChips({
  family,
  selectedModelId,
  onSelectMode,
  className = "",
}) {
  if (!family?.modes || family.modes.length <= 1) return null;

  return (
    <div
      className={`flex items-center gap-1.5 flex-wrap ${className}`}
      role="group"
      aria-label="Model mode"
      data-testid="mode-chips"
    >
      {family.modes.map((mode) => {
        const selected = mode.modelId === selectedModelId;
        return (
          <button
            key={mode.key}
            type="button"
            data-mode-key={mode.key}
            data-model-id={mode.modelId}
            title={mode.model?.name || mode.label}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMode?.(mode.model, mode);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border transition-all whitespace-nowrap ${
              selected
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Family dropdown: one row per family (not raw endpoint slugs).
 *
 * Multi-mode families expand inline ModeChips before commit.
 * Props: models, selectedModelId, onSelect(model, family?), onClose,
 * preferredOrder, sectionTitle, extraSections.
 */
export default function FamilyModePicker({
  models,
  selectedModelId,
  onSelect,
  onClose,
  preferredOrder,
  sectionTitle = "Models",
  searchPlaceholder = "Search families...",
  extraSections = [],
  domain,
}) {
  const [search, setSearch] = useState("");
  const [expandedFamilyId, setExpandedFamilyId] = useState(null);

  const order =
    preferredOrder ||
    (domain === "image" ? IMAGE_FAMILY_PRIORITY : VIDEO_FAMILY_PRIORITY);

  const families = useMemo(
    () => getFamilies(models, { preferredOrder: order }),
    [models, order],
  );
  const filtered = useMemo(
    () => filterFamiliesBySearch(families, search),
    [families, search],
  );

  const selectedFamily = findFamilyForModel(models, selectedModelId);
  const lf = (search || "").toLowerCase();

  const commitModel = (model, family) => {
    if (!model) return;
    onSelect?.(model, family);
    onClose?.();
  };

  const pickDefaultModel = (f) =>
    f.models.find((m) => m.id === selectedModelId) ||
    resolveVariant(f, { modeKey: "standard" }) ||
    f.models.find((m) => getModeIsDefault(m)) ||
    f.models[0];

  const renderFamily = (f) => {
    const isSelected = selectedFamily?.id === f.id;
    const multi = f.modes.length > 1;
    const showModes = multi && (expandedFamilyId === f.id || isSelected);

    return (
      <div
        key={f.id}
        className={`flex flex-col gap-2 p-3.5 rounded-2xl transition-all border ${
          isSelected || expandedFamilyId === f.id
            ? "bg-white/5 border-white/10"
            : "border-transparent hover:bg-white/5 hover:border-white/5"
        }`}
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (multi) {
              setExpandedFamilyId((cur) => (cur === f.id ? null : f.id));
              // Prefill family default so sidebar ModeChips also activate
              const model = pickDefaultModel(f);
              if (model && model.id !== selectedModelId) {
                onSelect?.(model, f);
              }
              return;
            }
            commitModel(pickDefaultModel(f), f);
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 shrink-0 ${accentClass(null, f.id)} border border-white/5 rounded-xl flex items-center justify-center font-black text-sm shadow-inner uppercase`}
            >
              {f.name.charAt(0)}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-bold text-white tracking-tight truncate">
                {f.name}
              </span>
              {multi && (
                <span className="text-[9px] text-white/35 truncate">
                  {f.modes.map((m) => m.label).join(" · ")}
                </span>
              )}
              <ModelBadges badges={f.badges} bestFor={f.bestFor} className="mt-0.5" />
            </div>
          </div>
          {isSelected && !multi && <CheckSvg />}
          {multi && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className={`opacity-40 transition-transform ${showModes ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>

        {showModes && (
          <ModeChips
            family={f}
            selectedModelId={selectedModelId}
            className="pl-[3.25rem]"
            onSelectMode={(model) => commitModel(model, f)}
          />
        )}
      </div>
    );
  };

  const renderExtraModel = (m, section) => {
    const accent = section.getRowAccent?.(m) || "orange";
    const hint = section.getRowHint?.(m);
    return (
      <div
        key={m.id}
        className={`flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 ${
          selectedModelId === m.id ? "bg-white/5 border-white/5" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          (section.onSelect || onSelect)?.(m);
          onClose?.();
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 shrink-0 ${accentClass(accent, m.family || m.id)} border border-white/5 rounded-xl flex items-center justify-center font-black text-sm shadow-inner uppercase`}
          >
            {m.name.charAt(0)}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              {m.name}
            </span>
            <ModelBadges badges={m.badges} bestFor={m.bestFor} />
            {hint && (
              <span className="text-[9px] text-orange-400/70 truncate">{hint}</span>
            )}
          </div>
        </div>
        {selectedModelId === m.id && <CheckSvg />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]" data-testid="family-mode-picker">
      <div className="px-2 pb-3 mb-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 focus-within:border-primary/50 transition-colors">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-none text-xs text-white focus:ring-0 w-full p-0 outline-none"
          />
        </div>
      </div>
      <div className="text-xs font-bold text-secondary px-3 py-2 shrink-0">
        {sectionTitle}
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 pb-2">
        {filtered.map(renderFamily)}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-xs text-white/30 text-center">
            No families match “{search}”
          </div>
        )}
        {(extraSections || []).map((section) => {
          const sectionModels = (section.models || []).filter(
            (m) =>
              !lf ||
              m.name?.toLowerCase().includes(lf) ||
              m.id?.toLowerCase().includes(lf),
          );
          if (sectionModels.length === 0) return null;
          return (
            <div key={section.title || "extra"}>
              <div
                className={`text-xs font-bold px-3 py-2 mt-1 border-t border-white/5 ${
                  section.titleClassName || "text-secondary"
                }`}
              >
                {section.title}
              </div>
              {sectionModels.map((m) => renderExtraModel(m, section))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getModeIsDefault(model) {
  const key = (model?.modeKey || model?.variant || model?.modeLabel || "")
    .toString()
    .toLowerCase();
  return (
    key.includes("standard") ||
    key === "t2v" ||
    key === "i2v" ||
    key === "t2i" ||
    key === "i2i"
  );
}

export {
  ModeChips,
  VIDEO_FAMILY_PRIORITY,
  IMAGE_FAMILY_PRIORITY,
  getFamilies,
  findFamilyForModel,
  resolveVariant,
  getFamilyDisplayName,
};
