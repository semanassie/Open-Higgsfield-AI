"use client";

import { useMemo, useState } from "react";
import { useAssets } from "../hooks/useAssets.js";
import { useCompare } from "../hooks/useCompare.js";
import { useRemix } from "../hooks/useRemix.js";
import { sendAssetTo } from "../lib/assetsStore.js";
import CompareView from "./CompareView.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
];

const SEND_TARGETS = [
  { id: "video", label: "Send to Video" },
  { id: "enhance", label: "Send to Enhance" },
  { id: "lipsync", label: "Send to Lipsync" },
  { id: "image", label: "Send to Image" },
];

/**
 * Light Assets panel: thumbnail grid, type filter, Send to…, remix/compare hooks.
 * Moodboard/elements UI is stubbed (API lives in assetsStore).
 */
export default function AssetsPanel({
  onRemix,
  onClose,
  className = "",
}) {
  const [filter, setFilter] = useState("all");
  const [showCompare, setShowCompare] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const type = filter === "all" ? null : filter;
  const { assets, loading, error, refresh, remove } = useAssets({ type });
  const compare = useCompare();
  const { remix } = useRemix({
    onApply: (meta) => onRemix?.(meta),
  });

  const emptyHint = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return error;
    return "No assets yet — generate something in Image or Video.";
  }, [loading, error]);

  return (
    <div
      className={`flex flex-col h-full w-full bg-[#0a0a0a] text-white border border-white/10 rounded-xl overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">Assets</h2>
          <p className="text-[11px] text-white/40">
            IndexedDB history · remix & compare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="text-[11px] px-2 py-1 rounded border border-white/15 hover:border-white/40 text-white/70"
          >
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] px-2 py-1 rounded border border-white/15 hover:border-white/40 text-white/70"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={!compare.canCompare}
            onClick={() => setShowCompare(true)}
            className="text-[11px] px-2.5 py-1 rounded border border-white/15 disabled:opacity-30 hover:border-white/40"
          >
            Compare ({compare.selected.length}/2)
          </button>
          {compare.selected.length > 0 && (
            <button
              type="button"
              onClick={compare.clear}
              className="text-[11px] text-white/40 hover:text-white/70"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Moodboard / Elements stub strip */}
      <div className="px-4 py-2 text-[10px] text-white/35 border-b border-white/5 flex gap-4">
        <span>Moodboard: API ready (stub UI)</span>
        <span>Elements: @mention API ready (stub UI)</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {assets.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-white/40">
            {emptyHint}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assets.map((asset) => {
              const selected = compare.isSelected(asset);
              return (
                <div
                  key={asset.id}
                  className={`relative group rounded-lg overflow-hidden border bg-black/40 ${
                    selected
                      ? "border-primary/70 ring-1 ring-primary/40"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <button
                    type="button"
                    className="block w-full aspect-square bg-black/50"
                    onClick={() => compare.toggle(asset)}
                    title="Toggle compare"
                  >
                    {asset.type === "video" ? (
                      <video
                        src={asset.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : asset.type === "audio" ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                        Audio
                      </div>
                    ) : (
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.prompt?.slice(0, 40) || "Asset"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>

                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white/80 truncate mb-1">
                      {asset.prompt || asset.model || asset.type}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-primary hover:text-black"
                        onClick={() => remix(asset)}
                      >
                        Remix
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
                          onClick={() =>
                            setMenuId((id) => (id === asset.id ? null : asset.id))
                          }
                        >
                          Send…
                        </button>
                        {menuId === asset.id && (
                          <div className="absolute bottom-full left-0 mb-1 z-10 min-w-[140px] rounded border border-white/15 bg-[#111] shadow-xl py-1">
                            {SEND_TARGETS.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className="block w-full text-left text-[10px] px-2 py-1.5 hover:bg-white/10"
                                onClick={() => {
                                  sendAssetTo(t.id, asset);
                                  setMenuId(null);
                                }}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-red-500/80"
                        onClick={() => remove(asset.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/60 text-white/60">
                    {asset.type}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCompare && compare.pair && (
        <CompareView
          left={compare.pair[0]}
          right={compare.pair[1]}
          onClose={() => setShowCompare(false)}
          onRemixLeft={() => remix(compare.pair[0])}
          onRemixRight={() => remix(compare.pair[1])}
        />
      )}
    </div>
  );
}
