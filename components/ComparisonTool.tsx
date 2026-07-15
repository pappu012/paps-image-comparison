"use client";

import { useState, useCallback, useEffect } from "react";
import Lane from "./Lane";
import SliderComparison from "./SliderComparison";
import DiffView from "./DiffView";
import VisualCheck from "./VisualCheck";
import { buildHtmlFolder, type HtmlFolderEntry } from "@/lib/htmlFolder";

export type FileAsset = {
  id: string;
  file: File | null;
  url: string;
  type: "image" | "video" | "pdf" | "html" | "url" | "unknown";
  ext: string;
  displayName?: string;
  folderName?: string; // set when loaded from a folder
  fileCount?: number;
};

export type LaneData = {
  id: string;
  label: string;
  asset: FileAsset | null;
};

export type CursorPos = { x: number; y: number } | null;

export type StickyGuide = { id: string; x: number; y: number; color: string };

const DEFAULT_LABELS = ["Main", "Supplied", "Created"];
const DEFAULT_GUIDE_COLOR = "#ffdc1e";

function RailIcon({
  active,
  title,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex flex-col items-center gap-1 shrink-0 w-full"
    >
      <span
        className="icon-pill w-11 h-11"
        style={
          active
            ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-text)" }
            : undefined
        }
      >
        {children}
      </span>
      <span
        className="text-[9px] font-medium leading-none"
        style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
      >
        {label}
      </span>
    </button>
  );
}

function IconHouse() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8.5V17h10V8.5" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 3 7l7 4 7-4-7-4Z" />
      <path d="M3 10.5 10 14.5 17 10.5" />
      <path d="M3 13.5 10 17.5 17 13.5" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1.2" />
      <rect x="11" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="11" width="6" height="6" rx="1.2" />
      <rect x="11" y="11" width="6" height="6" rx="1.2" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.4A1.5 1.5 0 0 0 8.1 17h3.8a1.5 1.5 0 0 0 1.5-1.6L14 6" />
    </svg>
  );
}

function IconCrosshairOff() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2" />
      <path d="M10 2v3M10 15v3M2 10h3M15 10h3" />
      <path d="M4 4l12 12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2" />
      <path d="M14 2.5V6h-3.5M6 17.5V14h3.5" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 9v5" />
      <circle cx="10" cy="6.5" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconMagnifier() {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M16.5 16.5 13 13" />
      <path d="M8.5 6v5M6 8.5h5" />
    </svg>
  );
}

function getAssetType(file: File): FileAsset["type"] {
  const mime = file.type;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/html") return "html";
  return "unknown";
}

function getExt(file: File): string {
  return file.name.split(".").pop()?.toUpperCase() ?? "FILE";
}

type ViewMode = "side-by-side" | "slider" | "stacked" | "grid" | "diff" | "check";

export default function ComparisonTool() {
  const [lanes, setLanes] = useState<LaneData[]>(
    DEFAULT_LABELS.map((label, i) => ({
      id: String(i),
      label,
      asset: null,
    }))
  );
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const [cursorPos, setCursorPos] = useState<CursorPos>(null);
  const [stickyGuides, setStickyGuides] = useState<StickyGuide[]>([]);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierZoom, setMagnifierZoom] = useState(3);

  const adjustMagnifierZoom = useCallback((delta: number) => {
    setMagnifierZoom((z) => Math.min(8, Math.max(1.5, z + delta)));
  }, []);

  const addStickyGuide = useCallback((x: number, y: number) => {
    setStickyGuides((prev) => [...prev, { id: Date.now().toString(), x, y, color: DEFAULT_GUIDE_COLOR }]);
  }, []);

  const removeStickyGuide = useCallback((id: string) => {
    setStickyGuides((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateStickyGuideColor = useCallback((id: string, color: string) => {
    setStickyGuides((prev) => prev.map((g) => g.id === id ? { ...g, color } : g));
  }, []);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dateStr, setDateStr] = useState("");
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const refreshAllPanels = () => setRefreshSignal((s) => s + 1);

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
    if (t) setTheme(t);
    setDateStr(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const hasAssets = lanes.some((l) => l.asset !== null);

  useEffect(() => {
    if (!hasAssets) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAssets]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
  };

  const addLane = () => {
    setLanes((prev) => [
      ...prev,
      { id: Date.now().toString(), label: `Lane ${prev.length + 1}`, asset: null },
    ]);
  };

  const removeLane = (id: string) => {
    setLanes((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setLanes((prev) => prev.map((l) => (l.id === id ? { ...l, label } : l)));
  };

  const setHtmlFolder = useCallback(async (laneId: string, entries: HtmlFolderEntry[]) => {
    const result = await buildHtmlFolder(entries);
    if (!result) return;
    const asset: FileAsset = {
      id: Date.now().toString(),
      file: entries.find(e => e.relativePath.endsWith(".html"))!.file,
      url: result.url,
      type: "html",
      ext: "HTML",
      folderName: result.folderName,
      fileCount: result.fileCount,
    };
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id !== laneId) return l;
        if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
        return { ...l, asset };
      })
    );
    setZoom(1);
  }, []);

  const setAsset = useCallback((laneId: string, file: File) => {
    const url = URL.createObjectURL(file);
    const asset: FileAsset = {
      id: Date.now().toString(),
      file,
      url,
      type: getAssetType(file),
      ext: getExt(file),
    };
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id !== laneId) return l;
        if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
        return { ...l, asset };
      })
    );
    setZoom(1);
  }, []);

  const setUrl = useCallback((laneId: string, url: string) => {
    const asset: FileAsset = {
      id: Date.now().toString(),
      file: null,
      url,
      type: "url",
      ext: "URL",
      displayName: url,
    };
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id !== laneId) return l;
        if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
        return { ...l, asset };
      })
    );
    setZoom(1);
  }, []);

  const clearAsset = (laneId: string) => {
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id !== laneId) return l;
        if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
        return { ...l, asset: null };
      })
    );
  };

  const reorderLanes = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setLanes((prev) => {
      const fromIdx = prev.findIndex((l) => l.id === fromId);
      const toIdx = prev.findIndex((l) => l.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const moveLane = (id: string, direction: "left" | "right") => {
    setLanes((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "left" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const clearAll = () => {
    if (!window.confirm("Clear all loaded assets from every lane? This can't be undone.")) return;
    lanes.forEach((l) => {
      if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
    });
    setLanes((prev) => prev.map((l) => ({ ...l, asset: null })));
  };

  const clearGrid = () => {
    if (!window.confirm("Reset to the default 3 lanes and clear all loaded assets? This can't be undone.")) return;
    lanes.forEach((l) => {
      if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
    });
    setLanes(
      DEFAULT_LABELS.map((label, i) => ({ id: String(i), label, asset: null }))
    );
    setZoom(1);
    setStickyGuides([]);
  };

  const clearGuides = () => {
    if (stickyGuides.length === 0) return;
    if (!window.confirm("Remove all sticky guides?")) return;
    setStickyGuides([]);
  };

  const filledLanes = lanes.filter((l) => l.asset !== null);
  const imageLanes = lanes.filter((l) => l.asset?.type === "image");
  const canSlider = imageLanes.length >= 2;
  const canDiff = imageLanes.length >= 2;

  return (
    <div className="h-screen w-full flex items-stretch justify-center p-[0.05rem] sm:p-[0.3em] gap-[0.2em] ">
      {/* Icon rail */}
      <aside className="flex flex-col items-center justify-between py-4 rounded-3xl glass-panel w-17 sm:w-19 shrink-0">
        <div className="flex flex-col items-center gap-2.5 w-full px-1">
          <RailIcon active={viewMode === "side-by-side"} title="Side by side" label="Split" onClick={() => setViewMode("side-by-side")}>
            <IconHouse />
          </RailIcon>
          <RailIcon active={viewMode === "stacked"} title="Stacked" label="Stack" onClick={() => setViewMode("stacked")}>
            <IconLayers />
          </RailIcon>
          <RailIcon active={viewMode === "grid"} title="Grid" label="Grid" onClick={() => setViewMode("grid")}>
            <IconGrid />
          </RailIcon>
          <button
            onClick={addLane}
            title="Add lane"
            className="flex flex-col items-center gap-1 shrink-0 w-full"
          >
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              <IconPlus />
            </span>
            <span className="text-[9px] font-medium leading-none" style={{ color: "var(--accent)" }}>
              Add
            </span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2.5 w-full px-1 relative">
          <RailIcon active={showInfoPopup} title="Lanes & supported formats" label="Info" onClick={() => setShowInfoPopup((v) => !v)}>
            <IconInfo />
          </RailIcon>
          <RailIcon title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} label="Theme" onClick={toggleTheme}>
            <IconGear />
          </RailIcon>

          {showInfoPopup && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowInfoPopup(false)} />
              <div
                className="absolute left-full bottom-0 ml-2 z-50 w-64 rounded-2xl p-4 flex flex-col gap-3 glass-panel"
                style={{ border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    Lanes
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {filledLanes.length}/{lanes.length} lanes loaded
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    Supported formats
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    JPG · PNG · GIF · WEBP · SVG · MP4 · WEBM · PDF · HTML / EDM / ANIMATED HTML
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main glass panel */}
      <div className="flex flex-col flex-1 min-w-0 rounded-3xl glass-panel overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between gap-2 px-2 sm:px-5 py-3 shrink-0 flex-wrap"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              Asset Comparison
            </h1>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {dateStr ? `${dateStr} · ` : ""}{filledLanes.length}/{lanes.length} lanes loaded
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Advanced view modes */}
            <div
              className="flex items-center rounded-full p-1 text-xs"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {(
                [
                  { mode: "slider", label: "Slider", disabled: !canSlider, hint: "Requires 2+ images" },
                  { mode: "diff", label: "Diff", disabled: !canDiff, hint: "Requires 2+ images" },
                  { mode: "check", label: "Render Check", disabled: false, hint: undefined },
                ] as { mode: ViewMode; label: string; disabled: boolean; hint?: string }[]
              ).map(({ mode, label, disabled, hint }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  disabled={disabled}
                  className="px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: viewMode === mode ? (mode === "diff" ? "#7c3aed" : "var(--accent)") : "transparent",
                    color: viewMode === mode ? (mode === "diff" ? "#fff" : "var(--accent-text)") : "var(--text-muted)",
                  }}
                  title={disabled ? hint : undefined}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowGuides((g) => !g)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{
                  background: showGuides ? "var(--accent)" : "transparent",
                  color: showGuides ? "var(--accent-text)" : "var(--text-muted)",
                }}
                title={showGuides ? "Hide guides" : "Show guides — hover any panel to align"}
              >
                <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2.5 16 5v5c0 4-2.7 6.3-6 7.5-3.3-1.2-6-3.5-6-7.5V5l6-2.5Z" />
                </svg>
                Guides
              </button>
              <button
                onClick={() => setShowMagnifier((m) => !m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{
                  background: showMagnifier ? "var(--accent)" : "transparent",
                  color: showMagnifier ? "var(--accent-text)" : "var(--text-muted)",
                }}
                title={showMagnifier ? `Hide loupe (scroll to adjust ${magnifierZoom.toFixed(1)}x)` : "Show loupe — hover an image to zoom into that spot"}
              >
                <IconMagnifier />
                Loupe
              </button>
            </div>

            {/* Zoom */}
            <div
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="hover-text w-5 text-center"
              >
                −
              </button>
              <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="hover-text w-5 text-center"
              >
                +
              </button>
              <button
                onClick={() => setZoom(1)}
                className="hover-text ml-1 pl-1"
                style={{ borderLeft: "1px solid var(--border)" }}
              >
                ↺
              </button>
            </div>

            <button
              onClick={refreshAllPanels}
              title="Refresh all panels"
              className="icon-pill w-9 h-9"
              style={{ color: "var(--text-muted)" }}
            >
              <IconRefresh />
            </button>

            {stickyGuides.length > 0 && (
              <button
                onClick={clearGuides}
                title="Clear all sticky guides"
                className="icon-pill w-9 h-9"
                style={{ color: "#e5877a" }}
              >
                <IconCrosshairOff />
              </button>
            )}

            {filledLanes.length > 0 && (
              <button
                onClick={clearAll}
                title="Clear all assets"
                className="icon-pill w-9 h-9"
                style={{ color: "#e5877a" }}
              >
                <IconTrash />
              </button>
            )}

            <button
              onClick={clearGrid}
              title="Reset to default 3 lanes and clear all assets"
              className="icon-pill w-9 h-9"
              style={{ color: "#e5877a" }}
            >
              <IconRefresh />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {viewMode === "check" ? (
          <VisualCheck lanes={lanes} />
        ) : viewMode === "diff" ? (
          <DiffView lanes={lanes} zoom={zoom} />
        ) : viewMode === "slider" && canSlider ? (
          <SliderComparison
            laneA={imageLanes[0]}
            laneB={imageLanes[1]}
            zoom={zoom}
            showGuides={showGuides}
            cursorPos={cursorPos}
            onCursorMove={setCursorPos}
            showMagnifier={showMagnifier}
            magnifierZoom={magnifierZoom}
            onMagnifierZoomChange={adjustMagnifierZoom}
          />
        ) : viewMode === "grid" ? (
          <div
            className="p-4 h-full overflow-auto scrollbar-thin"
            style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(lanes.length, 2)}, 1fr)`, gap: 16, minHeight: "100%" }}
          >
            {lanes.map((lane, idx) => (
              <Lane
                key={lane.id}
                lane={lane}
                zoom={zoom}
                viewMode="grid"
                canRemove={lanes.length > 1}
                canMoveLeft={idx > 0}
                canMoveRight={idx < lanes.length - 1}
                showGuides={showGuides}
                cursorPos={cursorPos}
                stickyGuides={stickyGuides}
                onCursorMove={setCursorPos}
                showMagnifier={showMagnifier}
                magnifierZoom={magnifierZoom}
                onMagnifierZoomChange={adjustMagnifierZoom}
                onAddStickyGuide={addStickyGuide}
                onRemoveStickyGuide={removeStickyGuide}
                onUpdateStickyGuide={updateStickyGuideColor}
                onSetAsset={(file) => setAsset(lane.id, file)}
                onSetHtmlFolder={(entries) => setHtmlFolder(lane.id, entries)}
                onSetUrl={(url) => setUrl(lane.id, url)}
                onClear={() => clearAsset(lane.id)}
                onRemove={() => removeLane(lane.id)}
                onLabelChange={(label) => updateLabel(lane.id, label)}
                onMoveLeft={() => moveLane(lane.id, "left")}
                onMoveRight={() => moveLane(lane.id, "right")}
                onReorder={(fromId) => reorderLanes(fromId, lane.id)}
                refreshSignal={refreshSignal}
              />
            ))}
          </div>
        ) : (
          <div
            className={`flex gap-4 p-4 h-full overflow-auto scrollbar-thin ${viewMode === "stacked" ? "flex-col" : "flex-row"}`}
            style={{ minHeight: "100%" }}
          >
            {lanes.map((lane, idx) => (
              <Lane
                key={lane.id}
                lane={lane}
                zoom={zoom}
                viewMode={viewMode}
                canRemove={lanes.length > 1}
                canMoveLeft={idx > 0}
                canMoveRight={idx < lanes.length - 1}
                showGuides={showGuides}
                cursorPos={cursorPos}
                stickyGuides={stickyGuides}
                onCursorMove={setCursorPos}
                showMagnifier={showMagnifier}
                magnifierZoom={magnifierZoom}
                onMagnifierZoomChange={adjustMagnifierZoom}
                onAddStickyGuide={addStickyGuide}
                onRemoveStickyGuide={removeStickyGuide}
                onUpdateStickyGuide={updateStickyGuideColor}
                onSetAsset={(file) => setAsset(lane.id, file)}
                onSetHtmlFolder={(entries) => setHtmlFolder(lane.id, entries)}
                onSetUrl={(url) => setUrl(lane.id, url)}
                onClear={() => clearAsset(lane.id)}
                onRemove={() => removeLane(lane.id)}
                onLabelChange={(label) => updateLabel(lane.id, label)}
                onMoveLeft={() => moveLane(lane.id, "left")}
                onMoveRight={() => moveLane(lane.id, "right")}
                onReorder={(fromId) => reorderLanes(fromId, lane.id)}
                refreshSignal={refreshSignal}
              />
            ))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
