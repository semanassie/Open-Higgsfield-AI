"use client";

import {
  FaImage,
  FaMagic,
  FaVideo,
  FaMusic,
  FaCut,
  FaFilm,
  FaComments,
  FaUserAlt,
  FaCamera,
  FaBullhorn,
  FaProjectDiagram,
  FaRobot,
  FaPalette,
} from "react-icons/fa";

const STUDIOS = [
  {
    tabId: "image",
    label: "Image Studio",
    description: "Text-to-image and image-to-image generation.",
    icon: FaImage,
  },
  {
    tabId: "enhance",
    label: "Enhancer",
    description: "Upscale and refine existing images.",
    icon: FaMagic,
  },
  {
    tabId: "video",
    label: "Video Studio",
    description: "Text, image, and video-to-video generation.",
    icon: FaVideo,
  },
  {
    tabId: "audio",
    label: "Audio Studio",
    description: "Generate and work with AI audio.",
    icon: FaMusic,
  },
  {
    tabId: "clipping",
    label: "AI Clipping",
    description: "Extract highlights from longer videos.",
    icon: FaCut,
  },
  {
    tabId: "vibe-motion",
    label: "Vibe Motion",
    description: "Motion-driven video workflows.",
    icon: FaFilm,
  },
  {
    tabId: "lipsync",
    label: "Lip Sync",
    description: "Sync speech to talking-head video.",
    icon: FaComments,
  },
  {
    tabId: "body-swap",
    label: "Body Swap",
    description: "Recast and body-swap performances.",
    icon: FaUserAlt,
  },
  {
    tabId: "cinema",
    label: "Cinema Studio",
    description: "Cinematic video generation controls.",
    icon: FaCamera,
  },
  {
    tabId: "marketing",
    label: "Marketing Studio",
    description: "Marketing-oriented creative presets.",
    icon: FaBullhorn,
  },
  {
    tabId: "workflows",
    label: "Workflows",
    description: "Chain multi-step generative pipelines.",
    icon: FaProjectDiagram,
  },
  {
    tabId: "agents",
    label: "Agents",
    description: "Agent-driven studio automation.",
    icon: FaRobot,
  },
  {
    tabId: "design-agent",
    label: "Design Agent",
    description: "AI-assisted design sessions.",
    icon: FaPalette,
  },
];

/**
 * Static studio launcher grid. Opens existing shell tabs via onOpenStudio(tabId).
 */
export default function StudioCatalog({ onOpenStudio }) {
  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-sm font-semibold tracking-wide text-white">
            Studios
          </h2>
          <p className="text-[11px] text-white/40 mt-1">
            Open any built-in studio from this catalog.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {STUDIOS.map((studio) => {
            const Icon = studio.icon;
            return (
              <button
                key={studio.tabId}
                type="button"
                onClick={() => onOpenStudio?.(studio.tabId)}
                className="text-left rounded-lg border border-white/10 bg-black/40 p-4 hover:border-white/30 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:border-[#22d3ee]/40 group-hover:text-[#22d3ee] transition-colors">
                  <Icon className="text-lg text-white/70 group-hover:text-[#22d3ee]" />
                </div>
                <h3 className="text-[13px] font-semibold text-white/90 mb-1">
                  {studio.label}
                </h3>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  {studio.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
