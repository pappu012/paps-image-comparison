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

export type StickyGuide = { id: string; x: number; y: number };

const DEFAULT_LABELS = ["Main", "Supplied", "Created"];

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

  const addStickyGuide = useCallback((x: number, y: number) => {
    setStickyGuides((prev) => [...prev, { id: Date.now().toString(), x, y }]);
  }, []);

  const removeStickyGuide = useCallback((id: string) => {
    setStickyGuides((prev) => prev.filter((g) => g.id !== id));
  }, []);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
    if (t) setTheme(t);
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
    lanes.forEach((l) => {
      if (l.asset && l.asset.type !== "url") URL.revokeObjectURL(l.asset.url);
    });
    setLanes((prev) => prev.map((l) => ({ ...l, asset: null })));
  };

  const filledLanes = lanes.filter((l) => l.asset !== null);
  const imageLanes = lanes.filter((l) => l.asset?.type === "image");
  const canSlider = imageLanes.length >= 2;
  const canDiff = imageLanes.length >= 2;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">Asset Comparison</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode */}
          <div
            className="flex rounded overflow-hidden text-xs"
            style={{ border: "1px solid var(--border)" }}
          >
            {(
              [
                { mode: "side-by-side", label: "Side by Side", disabled: false, hint: undefined },
                { mode: "stacked",      label: "Stacked",       disabled: false, hint: undefined },
                { mode: "grid",         label: "Grid",          disabled: false, hint: undefined },
                { mode: "slider",       label: "Slider",        disabled: !canSlider, hint: "Requires 2+ images" },
                { mode: "diff",         label: "Diff",          disabled: !canDiff,   hint: "Requires 2+ images" },
                { mode: "check",        label: "Render Check",  disabled: false, hint: undefined },
              ] as { mode: ViewMode; label: string; disabled: boolean; hint?: string }[]
            ).map(({ mode, label, disabled, hint }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                disabled={disabled}
                className="px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: viewMode === mode ? (mode === "diff" ? "#7c3aed" : "var(--accent)") : "transparent",
                  color: viewMode === mode ? "#fff" : "var(--text-muted)",
                }}
                title={disabled ? hint : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div
            className="flex items-center gap-1 rounded px-2 py-1 text-xs"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
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
            onClick={() => setShowGuides((g) => !g)}
            title={showGuides ? "Hide guides" : "Show guides — hover any panel to align"}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
            style={{
              border: `1px solid ${showGuides ? "rgba(255,220,30,0.5)" : "var(--border)"}`,
              color: showGuides ? "rgba(255,220,30,1)" : "var(--text-muted)",
              background: showGuides ? "rgba(255,220,30,0.08)" : "transparent",
            }}
          >
            <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4">
              <line x1="7" y1="0" x2="7" y2="5" />
              <line x1="7" y1="9" x2="7" y2="14" />
              <line x1="0" y1="7" x2="5" y2="7" />
              <line x1="9" y1="7" x2="14" y2="7" />
              <circle cx="7" cy="7" r="2" />
            </svg>
            Guides
          </button>

          <button
            onClick={addLane}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--text)";
              (e.target as HTMLElement).style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-muted)";
              (e.target as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            + Lane
          </button>

          {filledLanes.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1.5 rounded transition-colors"
              style={{ border: "1px solid var(--border)", color: "#e57373" }}
            >
              Clear All
            </button>
          )}

          {/* Theme toggle */}
          <div style={{ width: 1, height: 16, background: "var(--border)", marginLeft: 2 }} />
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              background: "transparent",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            {theme === "dark" ? (
              /* Sun — switch to light */
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
                <line x1="8" y1="1" x2="8" y2="3" />
                <line x1="8" y1="13" x2="8" y2="15" />
                <line x1="1" y1="8" x2="3" y2="8" />
                <line x1="13" y1="8" x2="15" y2="8" />
                <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" />
                <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" />
                <line x1="12.95" y1="3.05" x2="11.54" y2="4.46" />
                <line x1="4.46" y1="11.54" x2="3.05" y2="12.95" />
              </svg>
            ) : (
              /* Moon — switch to dark */
              <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                <path d="M13.5 10.5A5.5 5.5 0 0 1 5.5 2.5a.5.5 0 0 0-.64-.48A6.5 6.5 0 1 0 14 11.14a.5.5 0 0 0-.5-.64z" />
              </svg>
            )}
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
                onAddStickyGuide={addStickyGuide}
                onRemoveStickyGuide={removeStickyGuide}
                onSetAsset={(file) => setAsset(lane.id, file)}
                onSetHtmlFolder={(entries) => setHtmlFolder(lane.id, entries)}
                onSetUrl={(url) => setUrl(lane.id, url)}
                onClear={() => clearAsset(lane.id)}
                onRemove={() => removeLane(lane.id)}
                onLabelChange={(label) => updateLabel(lane.id, label)}
                onMoveLeft={() => moveLane(lane.id, "left")}
                onMoveRight={() => moveLane(lane.id, "right")}
                onReorder={(fromId) => reorderLanes(fromId, lane.id)}
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
                onAddStickyGuide={addStickyGuide}
                onRemoveStickyGuide={removeStickyGuide}
                onSetAsset={(file) => setAsset(lane.id, file)}
                onSetHtmlFolder={(entries) => setHtmlFolder(lane.id, entries)}
                onSetUrl={(url) => setUrl(lane.id, url)}
                onClear={() => clearAsset(lane.id)}
                onRemove={() => removeLane(lane.id)}
                onLabelChange={(label) => updateLabel(lane.id, label)}
                onMoveLeft={() => moveLane(lane.id, "left")}
                onMoveRight={() => moveLane(lane.id, "right")}
                onReorder={(fromId) => reorderLanes(fromId, lane.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer
        className="px-6 py-2 text-xs border-t shrink-0"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
          background: "var(--surface)",
        }}
      >
        <span>
          Supports: JPG · PNG · GIF · WEBP · SVG · MP4 · WEBM · PDF · HTML / EDM / ANIMATED HTML 
        </span>
        <span className="ml-4">
          {filledLanes.length}/{lanes.length} lanes loaded
        </span>
      </footer>
    </div>
  );
}
