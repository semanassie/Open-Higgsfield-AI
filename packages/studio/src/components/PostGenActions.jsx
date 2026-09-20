"use client";

import { useCallback, useState } from "react";
import CompareView from "./CompareView.jsx";
import {
  navigateWithPostGen,
  POSTGEN_NAV_EVENT,
} from "../lib/postGenTransfer.js";

export { navigateWithPostGen, POSTGEN_NAV_EVENT };

function RailButton({ title, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick?.(e);
      }}
      className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:border-primary/40 hover:bg-primary/10 transition-all disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
    >
      {children}
    </button>
  );
}

/**
 * Post-generation action rail for history / result cards.
 *
 * Actions (shown when relevant):
 * - Reuse — restore prompt + settings (+ refs) via onReuse
 * - Compare — side-by-side via CompareView (2+ history)
 * - Send to Video — image → VideoStudio I2V prefill
 * - Enhance — image → enhance tab prefill
 * - Lipsync — image or video → LipSyncStudio prefill
 */
export default function PostGenActions({
  entry,
  mediaType = "image",
  history = [],
  onReuse,
  showSendToVideo,
  showEnhance,
  showLipsync,
  className = "",
}) {
  const [comparePair, setComparePair] = useState(null);

  const canSendVideo = showSendToVideo ?? mediaType === "image";
  const canEnhance = showEnhance ?? mediaType === "image";
  const canLipsync =
    showLipsync ?? (mediaType === "image" || mediaType === "video");

  const comparePartner = (() => {
    if (!history || history.length < 2 || !entry?.url) return null;
    const others = history.filter(
      (h) => h && h.url && (h.id ? h.id !== entry.id : h.url !== entry.url),
    );
    return others[0] || null;
  })();

  const handleReuse = useCallback(() => {
    onReuse?.(entry);
  }, [entry, onReuse]);

  const handleCompare = useCallback(() => {
    if (!comparePartner) return;
    setComparePair({
      left: { ...entry, type: entry.type || mediaType },
      right: { ...comparePartner, type: comparePartner.type || mediaType },
    });
  }, [entry, comparePartner, mediaType]);

  const handleSendToVideo = useCallback(() => {
    if (!entry?.url) return;
    navigateWithPostGen("video", entry, "image");
  }, [entry]);

  const handleEnhance = useCallback(() => {
    if (!entry?.url) return;
    navigateWithPostGen("enhance", entry, "image");
  }, [entry]);

  const handleLipsync = useCallback(() => {
    if (!entry?.url) return;
    navigateWithPostGen("lipsync", entry, mediaType);
  }, [entry, mediaType]);

  if (!entry?.url) return null;

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1.5 pt-1 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <RailButton title="Reuse prompt and settings" onClick={handleReuse}>
          Reuse
        </RailButton>
        <RailButton
          title={
            comparePartner
              ? "Compare side-by-side with another result"
              : "Need 2+ results to compare"
          }
          onClick={handleCompare}
          disabled={!comparePartner}
        >
          Compare
        </RailButton>
        {canSendVideo && (
          <RailButton
            title="Send to Video (image-to-video)"
            onClick={handleSendToVideo}
          >
            Send to Video
          </RailButton>
        )}
        {canEnhance && (
          <RailButton title="Send to Enhance / upscale" onClick={handleEnhance}>
            Enhance
          </RailButton>
        )}
        {canLipsync && (
          <RailButton title="Send to Lip Sync" onClick={handleLipsync}>
            Lipsync
          </RailButton>
        )}
      </div>

      {comparePair && (
        <CompareView
          left={comparePair.left}
          right={comparePair.right}
          onClose={() => setComparePair(null)}
          onRemixLeft={() => {
            onReuse?.(comparePair.left);
            setComparePair(null);
          }}
          onRemixRight={() => {
            onReuse?.(comparePair.right);
            setComparePair(null);
          }}
        />
      )}
    </>
  );
}
