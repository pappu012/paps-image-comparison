"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Tour definition                                                   */
/* ------------------------------------------------------------------ */

type TourStep = {
  title: string;
  body: string;
  /** DOM targets to spotlight — the union of their rects is highlighted.
   *  Omit for a centered, target-less step. */
  selectors?: string[];
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Asset Comparison",
    body: "A quick 60-second tour of the workspace — or hit \"Load a demo\" to jump straight into live example lanes. You can skip any time and reopen this from the ? button in the sidebar.",
  },
  {
    title: "Choose a layout",
    body: "View your lanes Split (side by side), Stacked vertically, or in a Grid. These control how every loaded asset is arranged.",
    selectors: ['[data-tour="mode-split"]', '[data-tour="mode-stack"]', '[data-tour="mode-grid"]'],
  },
  {
    title: "Add a lane",
    body: "Start with two lanes and add more whenever you need to compare several assets at once.",
    selectors: ['[data-tour="add-lane"]'],
  },
  {
    title: "Bulk import",
    body: "Paste a list of { label, width, height } to create pre-sized lanes, or upload a .zip of creatives to load one lane per file automatically.",
    selectors: ['[data-tour="import"]'],
  },
  {
    title: "Your lanes",
    body: "Drag & drop a file onto any lane, or click to browse. Supports JPG, PNG, GIF, WEBP, SVG, MP4, WEBM, PDF, and HTML / EDM / animated-HTML folders.",
    selectors: ['[data-tour="workspace"]'],
  },
  {
    title: "Compare modes",
    body: "Slider drags a divider to reveal one asset over another. Diff highlights pixel-level changes between two images. Render Check previews how an asset renders in different contexts.",
    selectors: ['[data-tour="view-slider"]', '[data-tour="view-diff"]', '[data-tour="view-check"]'],
  },
  {
    title: "Precision tools",
    body: "Guides give you a live alignment crosshair plus pinnable sticky guides. Magnify zooms into the exact spot under your cursor — scroll to change its strength.",
    selectors: ['[data-tour="guides"]', '[data-tour="magnify"]'],
  },
  {
    title: "Zoom together",
    body: "Scale every lane at once, type an exact percentage, or reset to 100%. Great for inspecting fine detail across assets.",
    selectors: ['[data-tour="zoom"]'],
  },
  {
    title: "Info, theme & help",
    body: "Check how many lanes are loaded, switch between dark and light mode, and reopen this guide any time from the ? button.",
    selectors: ['[data-tour="utilities"]'],
  },
  {
    title: "You're all set",
    body: "Load your own assets, or hit \"Load a demo\" to drop the Sesimi site into several pre-sized lanes so you can try the grid, zoom and guides right away. Reopen this from the ? button any time.",
  },
];

const PAD = 8; // spotlight padding around the target
const GAP = 16; // gap between target and tooltip
const MARGIN = 12; // viewport edge margin
const TIP_W = 320;

type Box = { left: number; top: number; width: number; height: number; right: number; bottom: number };

function unionRect(selectors: string[]): Box | null {
  const rects: DOMRect[] = [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) rects.push(el.getBoundingClientRect());
  }
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { left, top, width: right - left, height: bottom - top, right, bottom };
}

function Tour({ onClose, onLoadDemo }: { onClose: () => void; onLoadDemo?: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;

  const next = useCallback(() => {
    setIndex((i) => (i < TOUR_STEPS.length - 1 ? i + 1 : i));
  }, []);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const compute = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = tipRef.current?.offsetWidth ?? TIP_W;
    const th = tipRef.current?.offsetHeight ?? 180;

    if (!step.selectors) {
      setRect(null);
      setPos({ left: Math.max(MARGIN, (vw - tw) / 2), top: Math.max(MARGIN, (vh - th) / 2) });
      return;
    }
    const r = unionRect(step.selectors);
    if (!r) {
      setRect(null);
      setPos({ left: Math.max(MARGIN, (vw - tw) / 2), top: Math.max(MARGIN, (vh - th) / 2) });
      return;
    }
    const padded: Box = {
      left: r.left - PAD,
      top: r.top - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
      right: r.right + PAD,
      bottom: r.bottom + PAD,
    };
    setRect(padded);

    const clampH = (l: number) => Math.min(Math.max(MARGIN, l), vw - tw - MARGIN);
    const clampV = (t: number) => Math.min(Math.max(MARGIN, t), vh - th - MARGIN);

    let left: number;
    let top: number;
    if (padded.right + GAP + tw <= vw - MARGIN) {
      left = padded.right + GAP;
      top = clampV(padded.top);
    } else if (padded.left - GAP - tw >= MARGIN) {
      left = padded.left - GAP - tw;
      top = clampV(padded.top);
    } else if (padded.bottom + GAP + th <= vh - MARGIN) {
      top = padded.bottom + GAP;
      left = clampH(padded.left);
    } else {
      top = Math.max(MARGIN, padded.top - GAP - th);
      left = clampH(padded.left);
    }
    setPos({ left, top });
  }, [step]);

  useLayoutEffect(() => {
    compute();
    // second pass once the tooltip has measured its real height
    const raf = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [compute]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, back]);

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Click-catcher — dims via the spotlight's box-shadow, blocks app interaction */}
      <div className="absolute inset-0" style={{ background: rect ? "transparent" : "rgba(0,0,0,0.55)" }} />

      {/* Spotlight */}
      {rect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            border: "2px solid var(--accent)",
            transition: "left .25s ease, top .25s ease, width .25s ease, height .25s ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="absolute rounded-2xl p-4 flex flex-col gap-3 glass-panel"
        style={{
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          width: TIP_W,
          maxWidth: "calc(100vw - 24px)",
          border: "1px solid var(--border-strong)",
          visibility: pos ? "visible" : "hidden",
          transition: "left .2s ease, top .2s ease",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] uppercase tracking-wide font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {isFirst || isLast ? "Guided tour" : `Step ${index} of ${TOUR_STEPS.length - 2}`}
          </span>
          <button
            onClick={onClose}
            className="hover-text text-xs"
            style={{ color: "var(--text-muted)" }}
            title="Close tour"
          >
            Skip ✕
          </button>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            {step.title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {step.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 16 : 6,
                background: i === index ? "var(--accent)" : "var(--border-strong)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={back}
            disabled={isFirst}
            className="text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "var(--text-muted)" }}
          >
            Back
          </button>
          {isLast ? (
            <div className="flex items-center gap-2">
              {onLoadDemo && (
                <button
                  onClick={() => {
                    onLoadDemo();
                    onClose();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
                >
                  Load a demo
                </button>
              )}
              <button
                onClick={onClose}
                className="text-xs px-4 py-1.5 rounded-full font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isFirst && onLoadDemo && (
                <button
                  onClick={() => {
                    onLoadDemo();
                    onClose();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
                  title="Skip the tour and load the Sesimi demo lanes"
                >
                  Load a demo
                </button>
              )}
              <button
                onClick={next}
                className="text-xs px-4 py-1.5 rounded-full font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {isFirst ? "Take the tour" : "Next"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Help panel (reference)                                            */
/* ------------------------------------------------------------------ */

type HelpSection = {
  heading: string;
  items: { term: string; desc: string }[];
};

const HELP_SECTIONS: HelpSection[] = [
  {
    heading: "Getting started",
    items: [
      { term: "1 · Load assets", desc: "Drag & drop a file onto a lane, or click the lane to browse. You can also paste a URL, or drop an entire HTML folder." },
      { term: "2 · Pick a layout", desc: "Split, Stacked, or Grid in the left sidebar arranges every lane." },
      { term: "3 · Compare", desc: "Use Slider, Diff, or Render Check in the top toolbar for focused comparisons." },
    ],
  },
  {
    heading: "Layouts (sidebar)",
    items: [
      { term: "Split", desc: "Lanes side by side — the default." },
      { term: "Stack", desc: "Lanes stacked vertically for tall or wide assets." },
      { term: "Grid", desc: "A two-column grid, handy for many lanes at once." },
    ],
  },
  {
    heading: "Compare modes (toolbar)",
    items: [
      { term: "Slider", desc: "Drag a divider to reveal one asset over another. Works with any two loaded assets — images, video, PDF, HTML or web pages. Needs 2+ assets." },
      { term: "Diff", desc: "Pixel-level diff between two images with a severity rating and a plain-English summary of what changed. Needs 2+ images." },
      { term: "Render Check", desc: "Preview how an asset renders across different contexts." },
    ],
  },
  {
    heading: "Precision tools (toolbar)",
    items: [
      { term: "Guides", desc: "A live crosshair that follows your cursor across lanes; click to pin sticky guides for alignment. The slider sets guide-line opacity." },
      { term: "Magnify", desc: "A loupe that zooms into the spot under your cursor. Scroll while hovering to change the magnification." },
      { term: "Zoom", desc: "Scales all lanes together. Click the percentage to type an exact value (1–100%), or ↺ to reset." },
    ],
  },
  {
    heading: "Loading & adding lanes",
    items: [
      { term: "Add lane", desc: "The + button adds another empty lane." },
      { term: "Import → Paste list", desc: "Paste an array of { label, width, height } to create pre-sized lanes for HTML/URL assets." },
      { term: "Import → Upload zip", desc: "Upload a .zip of creatives — one lane per file. Sizes like 300x250 in filenames are detected automatically." },
      { term: "Supported formats", desc: "JPG · PNG · GIF · WEBP · SVG · MP4 · WEBM · PDF · HTML / EDM / animated HTML." },
    ],
  },
  {
    heading: "Housekeeping (toolbar)",
    items: [
      { term: "Refresh", desc: "Reloads every panel — useful for animated HTML or video." },
      { term: "Clear guides", desc: "Removes all pinned sticky guides (appears once guides are pinned)." },
      { term: "Clear assets", desc: "Empties every lane but keeps your lane layout." },
      { term: "Reset lanes", desc: "Returns to the default two lanes and clears everything." },
      { term: "Theme", desc: "Toggle between dark and light mode in the sidebar." },
    ],
  },
];

function HelpPanel({
  onClose,
  onStartTour,
  onLoadDemo,
}: {
  onClose: () => void;
  onStartTour: () => void;
  onLoadDemo?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="How to use">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <aside
        className="relative h-full w-full max-w-md flex flex-col glass-panel"
        style={{ borderLeft: "1px solid var(--border)" }}
      >
        <header
          className="flex items-center justify-between gap-2 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              How to use
            </h2>
          </div>
          <button
            onClick={onClose}
            className="icon-pill w-8 h-8"
            style={{ color: "var(--text-muted)" }}
            title="Close"
            aria-label="Close help"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            Compare images, video, PDFs, HTML and EDM creatives side by side — with pixel diffing, alignment guides and a magnifier.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onStartTour}
              className="flex-1 text-xs px-4 py-2 rounded-full font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              ▶  Take the guided tour
            </button>
            {onLoadDemo && (
              <button
                onClick={() => {
                  onLoadDemo();
                  onClose();
                }}
                className="shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-colors"
                style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
                title="Load the Sesimi site into several pre-sized lanes"
              >
                Load a demo
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin px-5 py-4 flex flex-col gap-5">
          {HELP_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3
                className="text-[10px] uppercase tracking-wide font-semibold mb-2"
                style={{ color: "var(--accent)" }}
              >
                {section.heading}
              </h3>
              <dl className="flex flex-col gap-2.5">
                {section.items.map((item) => (
                  <div key={item.term} className="flex flex-col gap-0.5">
                    <dt className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                      {item.term}
                    </dt>
                    <dd className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {item.desc}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                  */
/* ------------------------------------------------------------------ */

const TOUR_SEEN_KEY = "paps-tour-seen";

export default function HowToUse({
  helpOpen,
  onCloseHelp,
  onLoadDemo,
}: {
  helpOpen: boolean;
  onCloseHelp: () => void;
  onLoadDemo?: () => void;
}) {
  const [tourOpen, setTourOpen] = useState(false);

  // First-run tour
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!seen) {
      // Let the UI paint before spotlighting elements.
      const t = setTimeout(() => setTourOpen(true), 450);
      return () => clearTimeout(t);
    }
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const startTour = useCallback(() => {
    onCloseHelp();
    setTourOpen(true);
  }, [onCloseHelp]);

  return (
    <>
      {helpOpen && <HelpPanel onClose={onCloseHelp} onStartTour={startTour} onLoadDemo={onLoadDemo} />}
      {tourOpen && <Tour onClose={closeTour} onLoadDemo={onLoadDemo} />}
    </>
  );
}
