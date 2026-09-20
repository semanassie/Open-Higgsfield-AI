"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateI2I, uploadFile } from "../muapi.js";
import { getI2IModelById } from "../models.js";
import {
  readPostGenPayload,
  POSTGEN_NAV_EVENT,
  ENHANCE_IMAGE_KEY,
} from "../lib/postGenTransfer.js";
import { consumeSendToPayload, SEND_TO_EVENT, saveGeneration } from "../lib/assetsStore.js";

/** Align with PostGenActions / postGenTransfer (W1). */
export const ENHANCE_PAYLOAD_KEY = ENHANCE_IMAGE_KEY;

const TOPAZ_MODEL_ID = "topaz-image-upscale";
const FALLBACK_MODEL_ID = "ai-image-upscaler";
const SCALE_OPTIONS = [1, 2, 4];
const HISTORY_KEY = "muapi_enhance_history";

const PRESETS = [
  {
    id: "flat-sharp",
    label: "Flat Sharp",
    description: "Clean 2× sharpen — product & UI shots",
    upscaleFactor: 2,
  },
  {
    id: "strong",
    label: "Strong",
    description: "Aggressive 4× upscale — max detail",
    upscaleFactor: 4,
  },
  {
    id: "portrait",
    label: "Portrait",
    description: "Subtle 1× face pass — enhance without enlarging",
    upscaleFactor: 1,
  },
];

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function imageUrlFromHandoff(payload) {
  if (!payload) return null;
  if (typeof payload === "string") {
    return payload.startsWith("http") ? payload : null;
  }
  return (
    payload.url ||
    payload.imageUrl ||
    payload.image_url ||
    payload.asset?.url ||
    null
  );
}

function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const containerRef = useRef(null);
  const [pos, setPos] = useState(50);
  const [containerW, setContainerW] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerW(el.offsetWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [beforeUrl, afterUrl]);

  const updateFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      updateFromClientX(clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  if (!beforeUrl) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-3xl mx-auto aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black select-none touch-none"
      onMouseDown={(e) => {
        dragging.current = true;
        updateFromClientX(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        updateFromClientX(e.touches[0].clientX);
      }}
    >
      <img
        src={afterUrl || beforeUrl}
        alt="After"
        className="absolute inset-0 w-full h-full object-contain bg-black"
        draggable={false}
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
        style={{ width: `${pos}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before"
          className="absolute inset-y-0 left-0 h-full object-contain bg-black max-w-none"
          style={{ width: containerW || "100%" }}
          draggable={false}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(34,211,238,0.6)] z-10"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/80 border border-primary/60 flex items-center justify-center text-primary shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/60 text-white/70 border border-white/10 z-20">
        Before
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 z-20">
        After
      </span>
    </div>
  );
}

export default function EnhanceStudio({ apiKey, droppedFiles, onFilesHandled }) {
  const [sourceUrl, setSourceUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [presetId, setPresetId] = useState("flat-sharp");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  const topazAvailable = !!getI2IModelById(TOPAZ_MODEL_ID);
  const fallbackAvailable = !!getI2IModelById(FALLBACK_MODEL_ID);

  // Restore history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw).slice(0, 24));
    } catch {
      /* ignore */
    }
  }, []);

  const applySource = useCallback((url) => {
    if (!url) return;
    setSourceUrl(url);
    setResultUrl(null);
    setUsedFallback(false);
    setError(null);
  }, []);

  // Handoff: postGenTransfer (PostGenActions) + assetsStore Send to… + legacy event
  useEffect(() => {
    const applyHandoff = (payload) => {
      const url = imageUrlFromHandoff(payload);
      if (url) applySource(url);
    };

    applyHandoff(readPostGenPayload({ matchTarget: "enhance" }));

    const sendTo = consumeSendToPayload();
    if (sendTo?.target === "enhance") {
      applyHandoff(sendTo.asset || sendTo.meta || sendTo);
    }

    const onPostGenNav = (e) => {
      if (e.detail?.tab === "enhance") applyHandoff(e.detail.payload);
    };
    const onSendTo = (e) => {
      if (e.detail?.target === "enhance") {
        applyHandoff(e.detail.asset || e.detail.meta || e.detail);
      }
    };
    const onLegacySend = (e) => {
      applyHandoff(e.detail);
    };

    window.addEventListener(POSTGEN_NAV_EVENT, onPostGenNav);
    window.addEventListener(SEND_TO_EVENT, onSendTo);
    window.addEventListener("muapi:send-to-enhance", onLegacySend);
    return () => {
      window.removeEventListener(POSTGEN_NAV_EVENT, onPostGenNav);
      window.removeEventListener(SEND_TO_EVENT, onSendTo);
      window.removeEventListener("muapi:send-to-enhance", onLegacySend);
    };
  }, [applySource]);

  // Dropped files from shell
  useEffect(() => {
    if (!droppedFiles?.length || !apiKey) return;
    const file = Array.from(droppedFiles).find((f) => f.type?.startsWith("image/"));
    if (!file) return;
    (async () => {
      setUploading(true);
      setError(null);
      try {
        const url = await uploadFile(apiKey, file, setUploadProgress);
        applySource(url);
      } catch (e) {
        setError(e.message?.slice(0, 120) || "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
        onFilesHandled?.();
      }
    })();
  }, [droppedFiles, apiKey, applySource, onFilesHandled]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !apiKey) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image too large (max 10MB)");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(apiKey, file, setUploadProgress);
      applySource(url);
    } catch (err) {
      setError(err.message?.slice(0, 120) || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const selectPreset = (preset) => {
    setPresetId(preset.id);
    setUpscaleFactor(preset.upscaleFactor);
  };

  const handleEnhance = async () => {
    if (!sourceUrl || enhancing || !apiKey) return;
    if (!topazAvailable && !fallbackAvailable) {
      setError("No upscale model in catalog (topaz / ai-image-upscaler)");
      return;
    }

    setEnhancing(true);
    setError(null);
    setUsedFallback(false);

    try {
      let res;
      let modelUsed = TOPAZ_MODEL_ID;
      let fellBack = false;

      const run = async (modelId, withFactor) => {
        const params = {
          model: modelId,
          image_url: sourceUrl,
          images_list: [sourceUrl],
        };
        if (withFactor) params.upscale_factor = upscaleFactor;
        return generateI2I(apiKey, params);
      };

      if (topazAvailable) {
        try {
          res = await run(TOPAZ_MODEL_ID, true);
        } catch (topazErr) {
          console.warn("[EnhanceStudio] topaz failed, trying fallback:", topazErr.message);
          if (!fallbackAvailable) throw topazErr;
          res = await run(FALLBACK_MODEL_ID, false);
          modelUsed = FALLBACK_MODEL_ID;
          fellBack = true;
        }
      } else {
        res = await run(FALLBACK_MODEL_ID, false);
        modelUsed = FALLBACK_MODEL_ID;
        fellBack = true;
      }

      if (!res?.url) throw new Error("No image URL in response");

      setResultUrl(res.url);
      setUsedFallback(fellBack);
      const entry = {
        id: res.id || Math.random().toString(36).slice(2, 9),
        url: res.url,
        beforeUrl: sourceUrl,
        model: modelUsed,
        upscaleFactor,
        presetId,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, 24);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* quota */
        }
        return next;
      });
      try {
        await saveGeneration({
          url: res.url,
          type: "image",
          model: modelUsed,
          studio: "enhance",
          refs: [sourceUrl],
          meta: { upscaleFactor, presetId, beforeUrl: sourceUrl },
        });
      } catch (assetsErr) {
        console.warn("[EnhanceStudio] assetsStore save skipped:", assetsErr?.message || assetsErr);
      }
    } catch (e) {
      console.error("[EnhanceStudio] Enhance failed:", e);
      setError(e.message?.slice(0, 100) || "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  };

  const activePreset = PRESETS.find((p) => p.id === presetId);

  return (
    <div className="w-full h-full flex flex-col bg-app-bg relative overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 pb-36">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Enhancer
            </h1>
            <p className="text-sm text-white/40 max-w-lg mx-auto">
              Upscale and sharpen with Topaz — drag the slider to compare before &amp; after.
            </p>
          </div>

          {sourceUrl ? (
            <BeforeAfterSlider beforeUrl={sourceUrl} afterUrl={resultUrl} />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!apiKey || uploading}
              className="w-full max-w-3xl mx-auto aspect-[4/3] rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-white/40 hover:text-primary"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-sm font-semibold">
                {uploading ? `Uploading ${uploadProgress}%…` : "Drop or click to upload an image"}
              </span>
            </button>
          )}

          {error && (
            <div className="max-w-3xl mx-auto text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {usedFallback && resultUrl && (
            <p className="text-center text-xs text-amber-400/80">
              Topaz unavailable — used AI Image Upscaler fallback (no scale factor).
            </p>
          )}

          {history.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/30 mb-3">
                Recent
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={`${item.upscaleFactor}× · ${item.presetId}`}
                    onClick={() => {
                      applySource(item.beforeUrl || item.url);
                      setResultUrl(item.url);
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-all group"
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-primary">
                      {item.upscaleFactor}×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 z-30 border-t border-white/5 bg-black/80 backdrop-blur-xl px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Upload / replace */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!apiKey || uploading}
              className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/80 hover:bg-white/10 transition-all disabled:opacity-40"
            >
              {sourceUrl ? "Replace" : "Upload"}
            </button>
            {sourceUrl && (
              <button
                type="button"
                onClick={() => {
                  setSourceUrl(null);
                  setResultUrl(null);
                }}
                className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/50 hover:text-red-400 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 mr-1">
              Preset
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.description}
                onClick={() => selectPreset(p)}
                className={`h-9 px-3 rounded-lg text-xs font-bold transition-all border ${
                  presetId === p.id
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Scale */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
              Scale
            </span>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {SCALE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setUpscaleFactor(n)}
                  className={`h-9 w-11 text-xs font-bold transition-all ${
                    upscaleFactor === n
                      ? "bg-primary text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {resultUrl && (
              <button
                type="button"
                onClick={() => downloadImage(resultUrl, `enhanced-${upscaleFactor}x.jpg`)}
                className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:text-white transition-all"
              >
                Download
              </button>
            )}
            <button
              type="button"
              onClick={handleEnhance}
              disabled={!sourceUrl || enhancing || !apiKey}
              className="h-10 px-6 rounded-lg bg-primary text-black text-xs font-extrabold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-w-[120px]"
            >
              {enhancing ? "Enhancing…" : `Enhance ${upscaleFactor}×`}
            </button>
          </div>
        </div>
        {activePreset && (
          <p className="max-w-5xl mx-auto mt-2 text-[11px] text-white/25">
            {activePreset.description}
            {topazAvailable
              ? " · via topaz-image-upscale"
              : " · Topaz missing — fallback ai-image-upscaler"}
          </p>
        )}
      </div>
    </div>
  );
}
