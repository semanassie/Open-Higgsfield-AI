"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { callLlm } from "../muapi.js";
import {
  llmModels,
  LLM_FAMILY_PRIORITY,
  getLlmModelById,
} from "../llmModels.js";
import { getFamilies } from "../modelFamilies.js";
import { GRADE_IDS, gradePromptClause } from "../lib/cinemaGrades.js";
import {
  runLocalDefaultChain,
  runLocalImageNode,
  runLocalVideoNode,
} from "../lib/workflowLocalAdapter.js";
import {
  createEmptyBeat,
  createEmptyProductionProject,
  forkProjectForVertical,
  loadProductionProject,
  normalizeProductionProject,
  primaryFormat,
  saveProductionProject,
} from "../lib/productionProject.js";
import {
  buildReferenceSpecPrompt,
  buildStoryPrompt,
  buildCriticPrompt,
  parseSpecJson,
  parseBeatsJson,
  parseDefectsJson,
  beatToGenerationPrompt,
  beatTimelineIndex,
} from "../lib/productionSpec.js";
import { listRecipes, combineRecipeAddons } from "../lib/productionRecipes.js";
import { canLeaveStep, canGoToStep, gateIdForStep } from "../lib/productionGates.js";
import {
  beatsToTimeline,
  downloadTimelineFallback,
  exportProductionTimeline,
  validateProductionTimeline,
} from "../lib/productionCompose.js";

const STEPS = [
  "Brief",
  "Reference",
  "Figures",
  "Story",
  "Generate",
  "Review",
  "Repair",
  "Assemble",
];

const FORMAT_OPTIONS = ["16:9", "9:16", "1:1"];

const SYSTEM_BASE =
  "You are a production-studio planner. Return only the requested JSON. Never invent metrics.";

export default function ProductionStudio({ apiKey }) {
  const [project, setProject] = useState(() => createEmptyProductionProject());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedBeatId, setSelectedBeatId] = useState(null);
  const [genIndex, setGenIndex] = useState(-1);

  useEffect(() => {
    setProject(loadProductionProject());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      saveProductionProject(project);
    }, 400);
    return () => clearTimeout(t);
  }, [project, hydrated]);

  const llmFamilies = useMemo(
    () => getFamilies(llmModels, { preferredOrder: LLM_FAMILY_PRIORITY }),
    [],
  );

  const recipes = useMemo(() => listRecipes(), []);

  const patch = useCallback((partial) => {
    setProject((prev) => normalizeProductionProject({ ...prev, ...partial }));
  }, []);

  const recipeAddon = useCallback(
    () => combineRecipeAddons(project.recipeIds),
    [project.recipeIds],
  );

  const selectedBeat =
    project.beats.find((b) => b.id === selectedBeatId) || project.beats[0] || null;

  const contactRows = useMemo(
    () => beatTimelineIndex(project.beats),
    [project.beats],
  );

  function goToStep(target) {
    if (!canGoToStep(project, target)) {
      setError("Approve the previous gate steps before continuing.");
      return;
    }
    setError("");
    patch({ step: target });
  }

  function approveCurrentGate() {
    const gate = gateIdForStep(project.step);
    if (!gate) return;
    patch({
      approvals: { ...project.approvals, [gate]: true },
      status: `Approved ${gate}`,
    });
  }

  async function buildSpec() {
    setBusy(true);
    setError("");
    try {
      const addon = recipeAddon();
      const raw = await callLlm(apiKey, {
        modelId: project.llmModelId,
        useCase: "production_reference_spec",
        systemPrompt: `${SYSTEM_BASE} ${addon}`.trim(),
        prompt: buildReferenceSpecPrompt({
          reference: project.reference,
          referenceUrl: project.referenceUrl,
          recipeAddon: addon,
          brief: project.brief,
        }),
      });
      const spec = parseSpecJson(raw);
      patch({
        spec: { ...project.spec, ...spec },
        status: "Spec ready",
        step: Math.max(project.step, 1),
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function writeBeats() {
    setBusy(true);
    setError("");
    try {
      const addon = recipeAddon();
      const raw = await callLlm(apiKey, {
        modelId: project.llmModelId,
        useCase: "production_story_beats",
        systemPrompt: `${SYSTEM_BASE} ${addon}`.trim(),
        prompt: buildStoryPrompt({
          storyBrief: project.storyBrief,
          spec: project.spec,
          figures: project.figures,
          recipeAddon: addon,
          brief: project.brief,
        }),
      });
      const beats = parseBeatsJson(raw);
      patch({
        beats,
        status: `${beats.length} beats`,
        step: Math.max(project.step, 3),
      });
      if (beats[0]) setSelectedBeatId(beats[0].id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function generateBeatAt(index, { audio } = { audio: project.includeAudio }) {
    const beat = project.beats[index];
    if (!beat) return;
    const gradeClause = gradePromptClause(project.gradeId);
    const prompt = beatToGenerationPrompt(
      beat,
      project.figures,
      gradeClause,
      project.brief,
    );
    const aspect = primaryFormat(project);
    const aspectParams = { aspect_ratio: aspect };

    if (audio) {
      const result = await runLocalDefaultChain(apiKey, {
        prompt,
        imageParams: aspectParams,
        i2vParams: aspectParams,
      });
      return {
        ...beat,
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        audioUrl: result.audioUrl,
      };
    }

    const imageRes = await runLocalImageNode(apiKey, {
      prompt,
      model: "nano-banana",
      ...aspectParams,
    });
    const imageUrl = imageRes?.url;
    if (!imageUrl) throw new Error("Image generation returned no url");
    const videoRes = await runLocalVideoNode(apiKey, {
      prompt,
      model: "wan2.1-image-to-video",
      image_url: imageUrl,
      ...aspectParams,
    });
    const videoUrl = videoRes?.url;
    if (!videoUrl) throw new Error("Video generation returned no url");
    return { ...beat, imageUrl, videoUrl, audioUrl: null };
  }

  async function generateAll() {
    if (!project.beats.length) {
      setError("Add story beats first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = [...project.beats];
      for (let i = 0; i < next.length; i++) {
        setGenIndex(i);
        patch({ status: `Generating beat ${i + 1}/${next.length}…` });
        next[i] = await generateBeatAt(i);
        patch({ beats: [...next] });
      }
      patch({
        beats: next,
        status: "Generation complete",
        step: Math.max(project.step, 5),
        combinedVideoUrl: null,
        timeline: null,
        review: {
          ...project.review,
          defects: [],
          contactSheetAt: Date.now(),
        },
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setGenIndex(-1);
      setBusy(false);
    }
  }

  async function regenSelected() {
    if (!selectedBeat) return;
    const index = project.beats.findIndex((b) => b.id === selectedBeat.id);
    if (index < 0) return;
    setBusy(true);
    setError("");
    try {
      setGenIndex(index);
      const updated = await generateBeatAt(index);
      const beats = project.beats.map((b, i) => (i === index ? updated : b));
      patch({
        beats,
        status: `Regenerated ${updated.id}`,
        combinedVideoUrl: null,
        timeline: null,
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setGenIndex(-1);
      setBusy(false);
    }
  }

  async function runCritic() {
    if (!project.beats.some((b) => b.imageUrl || b.videoUrl)) {
      setError("Generate beats first so the contact sheet has stills");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const raw = await callLlm(apiKey, {
        modelId: project.llmModelId,
        useCase: "production_critic",
        systemPrompt:
          `${SYSTEM_BASE} Return at most 3 defects as a JSON array.`.trim(),
        prompt: buildCriticPrompt({ beats: project.beats, defectsLimit: 3 }),
      });
      const defects = parseDefectsJson(raw, 3);
      patch({
        review: {
          ...project.review,
          defects,
          contactSheetAt: Date.now(),
        },
        status: `${defects.length} defect(s)`,
        step: Math.max(project.step, 6),
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function applyFixToBeat(defect) {
    if (!defect?.beatId) return;
    const beats = project.beats.map((b) =>
      b.id === defect.beatId
        ? {
            ...b,
            direction: [b.direction, defect.fix].filter(Boolean).join(" ").trim(),
          }
        : b,
    );
    patch({ beats, status: `Applied fix to ${defect.beatId}` });
    setSelectedBeatId(defect.beatId);
  }

  async function regenListedDefectBeats() {
    const ids = [
      ...new Set(
        (project.review?.defects || [])
          .map((d) => d.beatId)
          .filter(Boolean),
      ),
    ];
    if (!ids.length) {
      setError("No defect beat ids to regenerate");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = [...project.beats];
      for (let i = 0; i < next.length; i++) {
        if (!ids.includes(next[i].id)) continue;
        setGenIndex(i);
        patch({ status: `Repairing ${next[i].id}…` });
        next[i] = await generateBeatAt(i);
        patch({ beats: [...next] });
      }
      patch({
        beats: next,
        status: "Repair regen complete",
        combinedVideoUrl: null,
        timeline: null,
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setGenIndex(-1);
      setBusy(false);
    }
  }

  async function assemble() {
    setBusy(true);
    setError("");
    try {
      const beatsForTimeline = project.includeAudio
        ? project.beats
        : project.beats.map((b) => ({ ...b, audioUrl: null }));
      const timeline = beatsToTimeline(beatsForTimeline);
      if (!validateProductionTimeline(timeline)) {
        throw new Error("Need at least two beats with video URLs");
      }
      patch({ timeline, status: "Assembling…" });
      try {
        const url = await exportProductionTimeline(timeline, {
          onStatus: (m) => patch({ status: m }),
        });
        patch({
          timeline,
          combinedVideoUrl: url,
          status: "Assemble done",
          step: 7,
        });
      } catch (webavErr) {
        downloadTimelineFallback(timeline);
        patch({
          timeline,
          combinedVideoUrl: null,
          status: `WebAV failed (${webavErr.message}). Downloaded timeline.json + URLs.`,
          step: 7,
        });
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function forkVertical() {
    const forked = forkProjectForVertical(project);
    setProject(forked);
    setError("");
    setSelectedBeatId(forked.beats[0]?.id || null);
  }

  function addFigure() {
    const figures = [
      ...project.figures,
      {
        id: `fig_${project.figures.length + 1}`,
        label: "",
        value: "",
        note: "",
      },
    ];
    patch({ figures });
  }

  function addManualBeat() {
    const beats = [...project.beats, createEmptyBeat(project.beats.length)];
    patch({ beats, step: Math.max(project.step, 3) });
    setSelectedBeatId(beats[beats.length - 1].id);
  }

  function updateBrief(partial) {
    patch({
      brief: { ...project.brief, ...partial },
      approvals: { ...project.approvals, brief: false },
    });
  }

  function toggleFormat(fmt) {
    const formats = project.brief.formats.includes(fmt)
      ? project.brief.formats.filter((f) => f !== fmt)
      : [...project.brief.formats, fmt];
    const next = formats.length ? formats : ["16:9"];
    // Keep primary first when toggling on
    const ordered = next.includes(fmt) && !project.brief.formats.includes(fmt)
      ? [fmt, ...next.filter((f) => f !== fmt)]
      : next;
    updateBrief({ formats: ordered });
  }

  const currentLlm = getLlmModelById(project.llmModelId);
  const gate = gateIdForStep(project.step);
  const gateApproved = gate ? !!project.approvals?.[gate] : true;
  const canNext =
    project.step < STEPS.length - 1 && canLeaveStep(project, project.step);

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-6 custom-scrollbar text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold tracking-wide">Production</h2>
          <p className="text-[11px] text-white/40">
            Brief → reference → figures → story → generate → review → repair → assemble.
            Gates require Approve. MuAPI LLM + image/video chain + WebAV.
          </p>
        </header>

        <nav className="flex flex-wrap gap-1.5">
          {STEPS.map((label, i) => {
            const allowed = canGoToStep(project, i);
            return (
              <button
                key={label}
                type="button"
                disabled={busy || !allowed}
                onClick={() => goToStep(i)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  project.step === i
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                    : allowed
                      ? "border-white/10 text-white/50 hover:text-white/80"
                      : "border-white/5 text-white/25 cursor-not-allowed"
                }`}
              >
                {i + 1}. {label}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
          <label className="flex flex-col gap-1 text-[11px] text-white/50">
            Spec LLM
            <select
              className="bg-black/60 border border-white/15 rounded px-2 py-1.5 text-white/90 text-xs min-w-[14rem]"
              value={project.llmModelId || ""}
              disabled={busy}
              onChange={(e) => patch({ llmModelId: e.target.value })}
            >
              {llmFamilies.map((family) => (
                <optgroup key={family.id} label={family.id}>
                  {family.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.modeLabel}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {currentLlm && (
            <span className="text-[10px] text-white/35 pb-1.5">
              {currentLlm.name} · {currentLlm.modeLabel}
            </span>
          )}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {recipes.map((r) => {
              const on = project.recipeIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const recipeIds = on
                      ? project.recipeIds.filter((id) => id !== r.id)
                      : [...project.recipeIds, r.id];
                    patch({ recipeIds });
                  }}
                  className={`px-2 py-1 rounded border ${
                    on
                      ? "border-white/40 text-white/90"
                      : "border-white/10 text-white/40"
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-300/90 border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
            {error}
          </div>
        )}
        {project.status && (
          <div className="text-[11px] text-white/45">{project.status}</div>
        )}

        {/* Step 0 Brief */}
        {project.step === 0 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <label className="block text-[11px] text-white/50 space-y-1">
              Film (one sentence)
              <textarea
                className="w-full min-h-[72px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm text-white"
                value={project.brief.film}
                disabled={busy}
                onChange={(e) => updateBrief({ film: e.target.value })}
                placeholder="What is this film?"
              />
            </label>
            <label className="block text-[11px] text-white/50 space-y-1">
              Audience
              <input
                className="w-full bg-black/50 border border-white/15 rounded px-3 py-2 text-sm text-white"
                value={project.brief.audience}
                disabled={busy}
                onChange={(e) => updateBrief({ audience: e.target.value })}
              />
            </label>
            <label className="block text-[11px] text-white/50 space-y-1">
              Duration (sec)
              <input
                type="number"
                min={5}
                max={120}
                className="w-28 bg-black/50 border border-white/15 rounded px-2 py-1.5 text-xs"
                value={project.brief.durationSec}
                disabled={busy}
                onChange={(e) =>
                  updateBrief({ durationSec: Number(e.target.value) || 20 })
                }
              />
            </label>
            <div className="space-y-1">
              <span className="text-[11px] text-white/50">Formats (first = primary)</span>
              <div className="flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((fmt) => {
                  const on = project.brief.formats.includes(fmt);
                  const primary = project.brief.formats[0] === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      disabled={busy}
                      onClick={() => toggleFormat(fmt)}
                      className={`text-[11px] px-2.5 py-1 rounded border ${
                        on
                          ? primary
                            ? "border-cyan-400/50 text-cyan-100"
                            : "border-white/40 text-white/80"
                          : "border-white/10 text-white/40"
                      }`}
                    >
                      {fmt}
                      {primary ? " · primary" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block text-[11px] text-white/50 space-y-1">
              Keep
              <textarea
                className="w-full min-h-[60px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm"
                value={project.brief.keep}
                disabled={busy}
                onChange={(e) => updateBrief({ keep: e.target.value })}
              />
            </label>
            <label className="block text-[11px] text-white/50 space-y-1">
              Avoid
              <textarea
                className="w-full min-h-[60px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm"
                value={project.brief.avoid}
                disabled={busy}
                onChange={(e) => updateBrief({ avoid: e.target.value })}
              />
            </label>
            <label className="block text-[11px] text-white/50 space-y-1">
              Assets notes
              <textarea
                className="w-full min-h-[60px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm"
                value={project.brief.assetsNotes}
                disabled={busy}
                onChange={(e) => updateBrief({ assetsNotes: e.target.value })}
              />
            </label>
          </section>
        )}

        {/* Step 1 Reference */}
        {project.step === 1 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <label className="block text-[11px] text-white/50 space-y-1">
              Reference URL (optional)
              <input
                className="w-full bg-black/50 border border-white/15 rounded px-3 py-2 text-sm text-white"
                value={project.referenceUrl}
                disabled={busy}
                onChange={(e) =>
                  patch({
                    referenceUrl: e.target.value,
                    approvals: { ...project.approvals, reference: false },
                  })
                }
                placeholder="https://…"
              />
            </label>
            <label className="block text-[11px] text-white/50 space-y-1">
              What makes the reference work
              <textarea
                className="w-full min-h-[120px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm text-white"
                value={project.reference}
                disabled={busy}
                onChange={(e) =>
                  patch({
                    reference: e.target.value,
                    approvals: { ...project.approvals, reference: false },
                  })
                }
                placeholder="Pacing, first motion, text entrance, payoff…"
              />
            </label>
            <button
              type="button"
              disabled={busy || !apiKey}
              onClick={buildSpec}
              className="text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
            >
              Build spec
            </button>
            <div className="grid sm:grid-cols-2 gap-2">
              {["pacing", "firstMotion", "textEntrance", "payoff"].map((key) => (
                <label key={key} className="block text-[11px] text-white/50 space-y-1">
                  {key}
                  <input
                    className="w-full bg-black/50 border border-white/15 rounded px-2 py-1.5 text-xs text-white"
                    value={project.spec[key] || ""}
                    disabled={busy}
                    onChange={(e) =>
                      patch({
                        spec: { ...project.spec, [key]: e.target.value },
                        approvals: { ...project.approvals, reference: false },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Step 2 Figures */}
        {project.step === 2 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] text-white/45">
              Checked figures only. Empty is OK — Approve to continue. Numbers are injected into prompts; the model must not invent others.
            </p>
            {project.figures.map((fig, i) => (
              <div key={fig.id} className="grid grid-cols-3 gap-2">
                <input
                  className="bg-black/50 border border-white/15 rounded px-2 py-1.5 text-xs"
                  placeholder="Label"
                  value={fig.label}
                  disabled={busy}
                  onChange={(e) => {
                    const figures = project.figures.map((f, j) =>
                      j === i ? { ...f, label: e.target.value } : f,
                    );
                    patch({
                      figures,
                      approvals: { ...project.approvals, figures: false },
                    });
                  }}
                />
                <input
                  className="bg-black/50 border border-white/15 rounded px-2 py-1.5 text-xs"
                  placeholder="Value"
                  value={fig.value}
                  disabled={busy}
                  onChange={(e) => {
                    const figures = project.figures.map((f, j) =>
                      j === i ? { ...f, value: e.target.value } : f,
                    );
                    patch({
                      figures,
                      approvals: { ...project.approvals, figures: false },
                    });
                  }}
                />
                <div className="flex gap-1">
                  <input
                    className="flex-1 bg-black/50 border border-white/15 rounded px-2 py-1.5 text-xs"
                    placeholder="Note"
                    value={fig.note || ""}
                    disabled={busy}
                    onChange={(e) => {
                      const figures = project.figures.map((f, j) =>
                        j === i ? { ...f, note: e.target.value } : f,
                      );
                      patch({
                        figures,
                        approvals: { ...project.approvals, figures: false },
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="text-[10px] px-2 border border-white/15 rounded text-white/50"
                    onClick={() =>
                      patch({
                        figures: project.figures.filter((_, j) => j !== i),
                        approvals: { ...project.approvals, figures: false },
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFigure}
              className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/70"
            >
              Add figure
            </button>
          </section>
        )}

        {/* Step 3 Story */}
        {project.step === 3 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <label className="block text-[11px] text-white/50 space-y-1">
              Story brief
              <textarea
                className="w-full min-h-[100px] bg-black/50 border border-white/15 rounded px-3 py-2 text-sm"
                value={project.storyBrief}
                disabled={busy}
                onChange={(e) =>
                  patch({
                    storyBrief: e.target.value,
                    approvals: { ...project.approvals, story: false },
                  })
                }
                placeholder="What is this piece about?"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !apiKey}
                onClick={writeBeats}
                className="text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
              >
                Write beats
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={addManualBeat}
                className="text-xs px-3 py-2 rounded border border-white/20 text-white/70"
              >
                Add beat manually
              </button>
            </div>
            <ul className="space-y-2">
              {project.beats.map((beat, i) => (
                <li
                  key={beat.id}
                  className="rounded border border-white/10 bg-black/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/40">
                      {i + 1}. {beat.id}
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-white/40"
                      onClick={() =>
                        patch({
                          beats: project.beats.filter((b) => b.id !== beat.id),
                          approvals: { ...project.approvals, story: false },
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                    value={beat.title}
                    onChange={(e) => {
                      const beats = project.beats.map((b) =>
                        b.id === beat.id ? { ...b, title: e.target.value } : b,
                      );
                      patch({
                        beats,
                        approvals: { ...project.approvals, story: false },
                      });
                    }}
                  />
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                    placeholder="On-screen text"
                    value={beat.onScreen}
                    onChange={(e) => {
                      const beats = project.beats.map((b) =>
                        b.id === beat.id ? { ...b, onScreen: e.target.value } : b,
                      );
                      patch({
                        beats,
                        approvals: { ...project.approvals, story: false },
                      });
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-20 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                      value={beat.durationSec}
                      onChange={(e) => {
                        const beats = project.beats.map((b) =>
                          b.id === beat.id
                            ? { ...b, durationSec: Number(e.target.value) || 4 }
                            : b,
                        );
                        patch({
                          beats,
                          approvals: { ...project.approvals, story: false },
                        });
                      }}
                    />
                    <input
                      className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                      placeholder="Hole / visual"
                      value={beat.hole}
                      onChange={(e) => {
                        const beats = project.beats.map((b) =>
                          b.id === beat.id ? { ...b, hole: e.target.value } : b,
                        );
                        patch({
                          beats,
                          approvals: { ...project.approvals, story: false },
                        });
                      }}
                    />
                  </div>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                    placeholder="Entry state"
                    value={beat.entryState || ""}
                    onChange={(e) => {
                      const beats = project.beats.map((b) =>
                        b.id === beat.id
                          ? { ...b, entryState: e.target.value }
                          : b,
                      );
                      patch({
                        beats,
                        approvals: { ...project.approvals, story: false },
                      });
                    }}
                  />
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                    placeholder="Exit state"
                    value={beat.exitState || ""}
                    onChange={(e) => {
                      const beats = project.beats.map((b) =>
                        b.id === beat.id
                          ? { ...b, exitState: e.target.value }
                          : b,
                      );
                      patch({
                        beats,
                        approvals: { ...project.approvals, story: false },
                      });
                    }}
                  />
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                    placeholder="Purpose"
                    value={beat.purpose || ""}
                    onChange={(e) => {
                      const beats = project.beats.map((b) =>
                        b.id === beat.id ? { ...b, purpose: e.target.value } : b,
                      );
                      patch({
                        beats,
                        approvals: { ...project.approvals, story: false },
                      });
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Step 4 Generate */}
        {project.step === 4 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[11px] text-white/50 flex flex-col gap-1">
                Grade
                <select
                  className="bg-black/60 border border-white/15 rounded px-2 py-1.5 text-xs"
                  value={project.gradeId || "neutral-print"}
                  disabled={busy}
                  onChange={(e) => patch({ gradeId: e.target.value })}
                >
                  {GRADE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-[11px] text-white/40 pt-4">
                Aspect: {primaryFormat(project)}
              </span>
              <label className="text-[11px] text-white/50 flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  checked={project.includeAudio}
                  disabled={busy}
                  onChange={(e) => patch({ includeAudio: e.target.checked })}
                />
                Include audio (Suno chain)
              </label>
              <button
                type="button"
                disabled={busy || !apiKey || !project.beats.length}
                onClick={generateAll}
                className="ml-auto text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
              >
                {busy && genIndex >= 0
                  ? `Generating ${genIndex + 1}/${project.beats.length}…`
                  : "Generate all beats"}
              </button>
            </div>
            <ul className="space-y-2">
              {project.beats.map((beat) => (
                <li
                  key={beat.id}
                  className="flex items-center gap-3 border border-white/10 rounded p-2 text-xs"
                >
                  <div className="flex-1">
                    <div className="text-white/80">{beat.title}</div>
                    <div className="text-white/35">{beat.onScreen}</div>
                  </div>
                  {beat.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={beat.imageUrl}
                      alt=""
                      className="w-12 h-12 object-cover rounded border border-white/10"
                    />
                  )}
                  <span className="text-white/40">
                    {beat.videoUrl ? "video ✓" : "—"}
                    {beat.audioUrl ? " · audio ✓" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Step 5 Review */}
        {project.step === 5 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] text-white/45">
              Contact sheet of generated stills. Run critic for up to 3 defects.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contactRows.map((row) => {
                const still = row.imageUrl || null;
                const beat = project.beats.find((b) => b.id === row.beatId);
                return (
                  <div
                    key={row.beatId}
                    className="rounded border border-white/10 bg-black/50 overflow-hidden"
                  >
                    {still ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={still}
                        alt=""
                        className="w-full aspect-video object-cover"
                      />
                    ) : beat?.videoUrl ? (
                      <video
                        src={beat.videoUrl}
                        muted
                        playsInline
                        className="w-full aspect-video object-cover bg-black"
                      />
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center text-[10px] text-white/30">
                        no still
                      </div>
                    )}
                    <div className="px-2 py-1.5 text-[10px] text-white/50">
                      t={row.timestampSec}s · {row.beatId}
                      <div className="text-white/70 truncate">{row.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={busy || !apiKey}
              onClick={runCritic}
              className="text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
            >
              Run critic
            </button>
            {(project.review?.defects || []).length > 0 && (
              <ul className="space-y-2 text-xs">
                {project.review.defects.map((d, i) => (
                  <li
                    key={`${d.beatId}-${i}`}
                    className="rounded border border-white/10 p-2 text-white/70"
                  >
                    <div className="text-white/40">
                      {d.beatId} @ {d.timestampSec}s
                    </div>
                    <div>{d.evidence}</div>
                    <div className="text-cyan-200/80">Fix: {d.fix}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Step 6 Repair */}
        {project.step === 6 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] text-white/45">
              Edit defects, apply fixes into beat direction, then regenerate listed beats.
            </p>
            {(project.review?.defects || []).length === 0 && (
              <p className="text-[11px] text-white/40">
                No defects yet — run critic on Review, or skip to Assemble.
              </p>
            )}
            <ul className="space-y-3">
              {(project.review?.defects || []).map((d, i) => (
                <li
                  key={`${d.beatId}-${i}`}
                  className="rounded border border-white/10 bg-black/40 p-3 space-y-2"
                >
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="block text-[11px] text-white/50 space-y-1">
                      beatId
                      <input
                        className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                        value={d.beatId}
                        onChange={(e) => {
                          const defects = project.review.defects.map((x, j) =>
                            j === i ? { ...x, beatId: e.target.value } : x,
                          );
                          patch({ review: { ...project.review, defects } });
                        }}
                      />
                    </label>
                    <label className="block text-[11px] text-white/50 space-y-1">
                      timestampSec
                      <input
                        type="number"
                        className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                        value={d.timestampSec}
                        onChange={(e) => {
                          const defects = project.review.defects.map((x, j) =>
                            j === i
                              ? { ...x, timestampSec: Number(e.target.value) || 0 }
                              : x,
                          );
                          patch({ review: { ...project.review, defects } });
                        }}
                      />
                    </label>
                  </div>
                  <label className="block text-[11px] text-white/50 space-y-1">
                    Evidence
                    <textarea
                      className="w-full min-h-[48px] bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                      value={d.evidence}
                      onChange={(e) => {
                        const defects = project.review.defects.map((x, j) =>
                          j === i ? { ...x, evidence: e.target.value } : x,
                        );
                        patch({ review: { ...project.review, defects } });
                      }}
                    />
                  </label>
                  <label className="block text-[11px] text-white/50 space-y-1">
                    Fix
                    <textarea
                      className="w-full min-h-[48px] bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
                      value={d.fix}
                      onChange={(e) => {
                        const defects = project.review.defects.map((x, j) =>
                          j === i ? { ...x, fix: e.target.value } : x,
                        );
                        patch({ review: { ...project.review, defects } });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => applyFixToBeat(d)}
                    className="text-[11px] px-2.5 py-1.5 rounded border border-white/20 text-white/70"
                  >
                    Apply fix to beat
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !apiKey}
                onClick={regenListedDefectBeats}
                className="text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
              >
                Regen listed beats
              </button>
              <label className="text-[11px] text-white/50 flex flex-col gap-1 min-w-[10rem]">
                Beat preview
                <select
                  className="bg-black/60 border border-white/15 rounded px-2 py-1.5 text-xs"
                  value={selectedBeat?.id || ""}
                  onChange={(e) => setSelectedBeatId(e.target.value)}
                >
                  {project.beats.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedBeat && (
                <button
                  type="button"
                  disabled={busy || !apiKey}
                  onClick={regenSelected}
                  className="text-xs px-3 py-2 rounded border border-white/20 text-white/70 disabled:opacity-40 self-end"
                >
                  Regen selected
                </button>
              )}
            </div>
            {selectedBeat?.videoUrl && (
              <video
                src={selectedBeat.videoUrl}
                controls
                className="w-full max-h-64 rounded border border-white/10 bg-black"
              />
            )}
          </section>
        )}

        {/* Step 7 Assemble */}
        {project.step === 7 && (
          <section className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] text-white/45">
              Stitch beat videos with WebAV (muxes beat audio when enabled). On failure, download timeline.json and clip URLs.
              Fork for 9:16 clears media and regenerates — no crop.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={assemble}
                className="text-xs px-3 py-2 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 disabled:opacity-40"
              >
                Assemble
              </button>
              <button
                type="button"
                disabled={!project.beats.some((b) => b.videoUrl)}
                onClick={() =>
                  downloadTimelineFallback(
                    beatsToTimeline(
                      project.includeAudio
                        ? project.beats
                        : project.beats.map((b) => ({ ...b, audioUrl: null })),
                    ),
                  )
                }
                className="text-xs px-3 py-2 rounded border border-white/20 text-white/70"
              >
                Download timeline JSON
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={forkVertical}
                className="text-xs px-3 py-2 rounded border border-amber-400/40 bg-amber-400/10 text-amber-100 disabled:opacity-40"
              >
                Fork project for 9:16
              </button>
            </div>
            {project.combinedVideoUrl && (
              <video
                src={project.combinedVideoUrl}
                controls
                className="w-full max-h-80 rounded border border-white/10 bg-black"
              />
            )}
          </section>
        )}

        <div className="flex justify-between items-center pt-2 pb-8 gap-2">
          <button
            type="button"
            disabled={busy || project.step === 0}
            onClick={() => patch({ step: Math.max(0, project.step - 1) })}
            className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/60 disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {gate && (
              <button
                type="button"
                disabled={busy || gateApproved}
                onClick={approveCurrentGate}
                className={`text-xs px-3 py-1.5 rounded border ${
                  gateApproved
                    ? "border-emerald-400/40 text-emerald-200/80"
                    : "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                } disabled:opacity-60`}
              >
                {gateApproved ? `Approved · ${gate}` : `Approve ${gate}`}
              </button>
            )}
            <button
              type="button"
              disabled={busy || !canNext}
              onClick={() => {
                if (!canLeaveStep(project, project.step)) {
                  setError("Approve this step before continuing.");
                  return;
                }
                goToStep(Math.min(STEPS.length - 1, project.step + 1));
              }}
              className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/60 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
