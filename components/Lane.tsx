"use client";

import { useRef, useState, useEffect, DragEvent, MouseEvent } from "react";
import { LaneData, CursorPos, StickyGuide } from "./ComparisonTool";
import { HtmlFolderEntry, readDirectoryEntry } from "@/lib/htmlFolder";
import FilePreview from "./FilePreview";

const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "text/html",
];

const TYPE_COLORS: Record<string, string> = {
  JPG: "#e8965a",
  JPEG: "#e8965a",
  PNG: "#5ab0e8",
  GIF: "#9c5ae8",
  WEBP: "#5ae896",
  SVG: "#e8d65a",
  MP4: "#e85a5a",
  WEBM: "#e85a9c",
  PDF: "#e85a5a",
  HTML: "#e8a05a",
  URL: "#4a9eff",
};

interface Props {
  lane: LaneData;
  zoom: number;
  viewMode: "side-by-side" | "stacked" | "grid" | "slider" | "check";
  canRemove: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  showGuides?: boolean;
  cursorPos?: CursorPos;
  stickyGuides?: StickyGuide[];
  onCursorMove?: (pos: CursorPos) => void;
  onAddStickyGuide?: (x: number, y: number) => void;
  onRemoveStickyGuide?: (id: string) => void;
  onUpdateStickyGuide?: (id: string, color: string) => void;
  onSetAsset: (file: File) => void;
  onSetHtmlFolder: (entries: HtmlFolderEntry[]) => void;
  onSetUrl: (url: string) => void;
  onClear: () => void;
  onRemove: () => void;
  onLabelChange: (label: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onReorder?: (fromId: string) => void;
}

export default function Lane({
  lane,
  zoom,
  viewMode,
  canRemove,
  canMoveLeft,
  canMoveRight,
  showGuides,
  cursorPos,
  stickyGuides = [],
  onCursorMove,
  onAddStickyGuide,
  onRemoveStickyGuide,
  onUpdateStickyGuide,
  onSetAsset,
  onSetHtmlFolder,
  onSetUrl,
  onClear,
  onRemove,
  onLabelChange,
  onMoveLeft,
  onMoveRight,
  onReorder,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);
  const [colorPickingId, setColorPickingId] = useState<string | null>(null);
  const [laneDropOver, setLaneDropOver] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(lane.label);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [htmlDimensions, setHtmlDimensions] = useState<{ w: number; h: number } | null>(null);
  const [viewportW, setViewportW] = useState<number | null>(null);
  const [viewportH, setViewportH] = useState<number | null>(null);
  const [customW, setCustomW] = useState("1280");
  const [customH, setCustomH] = useState("800");
  const [customActive, setCustomActive] = useState(false);

  // Track rendered pixel size for HTML assets
  useEffect(() => {
    if (lane.asset?.type !== "html" || !contentAreaRef.current) {
      setHtmlDimensions(null);
      return;
    }
    const el = contentAreaRef.current;
    const update = () => setHtmlDimensions({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lane.asset?.type]);

  // Set webkitdirectory on folder input (not in React's type defs)
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
    }
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ACCEPTED.includes(file.type)) {
      alert(`Unsupported file type: ${file.type || file.name}`);
      return;
    }
    onSetAsset(file);
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const entries: HtmlFolderEntry[] = Array.from(files).map((f) => ({
      file: f,
      relativePath: (f as unknown as { webkitRelativePath: string }).webkitRelativePath || f.name,
    }));
    onSetHtmlFolder(entries);
    // reset so the same folder can be re-selected
    e.target.value = "";
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    // Check if a directory was dropped
    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        try {
          const folderEntries = await readDirectoryEntry(
            entry as FileSystemDirectoryEntry,
            entry.name
          );
          onSetHtmlFolder(folderEntries);
        } catch {
          alert("Could not read folder contents.");
        }
        return;
      }
    }

    // Regular file drop
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleContentMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!showGuides) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onCursorMove?.({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const handleContentMouseLeave = () => {
    if (showGuides) onCursorMove?.(null);
  };

  const submitUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      alert("Please enter a valid URL starting with http:// or https://");
      return;
    }
    onSetUrl(trimmed);
    setShowUrlInput(false);
    setUrlDraft("");
  };

  const commitLabel = () => {
    setEditingLabel(false);
    if (labelDraft.trim()) onLabelChange(labelDraft.trim());
    else setLabelDraft(lane.label);
  };

  const ext = lane.asset?.ext ?? "";
  const extColor = TYPE_COLORS[ext] ?? "#888";
  const isStacked = viewMode === "stacked";
  const isGrid = viewMode === "grid";
  const isFolder = !!lane.asset?.folderName;

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden shrink-0 glass-card ${isStacked ? "w-full" : "flex-1 min-w-0"}`}
      style={{
        borderColor: laneDropOver ? "rgb(255, 220, 30)" : dragging ? "var(--accent)" : "var(--border)",
        minHeight: isStacked ? "320px" : undefined,
        height: isStacked ? "320px" : isGrid ? undefined : "100%",
        transition: "border-color 0.15s ease",
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("lane-reorder")) {
          e.preventDefault();
          setLaneDropOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setLaneDropOver(false);
        }
      }}
      onDrop={(e) => {
        const fromId = e.dataTransfer.getData("lane-reorder");
        if (fromId) {
          e.preventDefault();
          setLaneDropOver(false);
          onReorder?.(fromId);
        }
      }}
    >
      {/* Lane header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {lane.asset && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "var(--accent)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)" }}
            />
          )}
          <div
            draggable
            onDragStart={(e: DragEvent<HTMLDivElement>) => {
              e.dataTransfer.setData("lane-reorder", lane.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab active:cursor-grabbing flex items-center shrink-0 select-none hover-text"
            style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1, marginRight: -2 }}
            title="Drag to reorder lane"
          >
            ⠿
          </div>
          {editingLabel ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitLabel();
                if (e.key === "Escape") {
                  setLabelDraft(lane.label);
                  setEditingLabel(false);
                }
              }}
              className="text-sm font-medium bg-transparent outline-none border-b w-28"
              style={{ borderColor: "var(--accent)", color: "var(--text)" }}
            />
          ) : (
            <button
              onClick={() => {
                setLabelDraft(lane.label);
                setEditingLabel(true);
              }}
              className="flex items-center gap-1 text-sm font-semibold hover:underline truncate group"
              style={{ color: "var(--text)" }}
              title="Click to rename"
            >
              {lane.label}
              <svg
                viewBox="0 0 12 12"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 transition-opacity"
                style={{ opacity: 0.35, color: "var(--text-muted)" }}
              >
                <path d="M8.5 1.5 10.5 3.5 4 10H2v-2z" />
              </svg>
            </button>
          )}

          {lane.asset && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0"
              style={{ background: extColor + "22", color: extColor }}
            >
              {isFolder ? "FOLDER" : ext}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {lane.asset && (
            <>
              {lane.asset.type === "url" ? (
                <button
                  onClick={() => { setUrlDraft(lane.asset!.url); setShowUrlInput(true); }}
                  className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                  title="Edit URL"
                >
                  ✎ URL
                </button>
              ) : (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                  title="Replace file"
                >
                  ↑ Replace
                </button>
              )}
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
                title="Reload"
              >
                ↻
              </button>
              <button
                onClick={onClear}
                className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
                title="Clear"
              >
                ✕
              </button>
            </>
          )}
          {(canMoveLeft || canMoveRight) && (
            <>
              <button
                onClick={onMoveLeft}
                disabled={!canMoveLeft}
                className="text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors disabled:opacity-20 hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
                title="Move lane left"
              >
                ←
              </button>
              <button
                onClick={onMoveRight}
                disabled={!canMoveRight}
                className="text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors disabled:opacity-20 hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
                title="Move lane right"
              >
                →
              </button>
            </>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
              style={{ color: "#e5877a" }}
              title="Remove lane"
            >
              ⊖
            </button>
          )}
        </div>
      </div>

      {/* URL input bar */}
      {showUrlInput && (
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
        >
          <input
            autoFocus
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitUrl();
              if (e.key === "Escape") { setShowUrlInput(false); setUrlDraft(""); }
            }}
            placeholder="https://..."
            className="flex-1 text-xs px-2 py-1 rounded outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--accent)",
              color: "var(--text)",
              minWidth: 0,
            }}
          />
          <button
            onClick={submitUrl}
            className="text-xs px-2 py-1 rounded shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            Load
          </button>
          <button
            onClick={() => { setShowUrlInput(false); setUrlDraft(""); }}
            className="text-xs px-1 shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Viewport toolbar — HTML and URL */}
      {(lane.asset?.type === "html" || lane.asset?.type === "url") && (
        <div
          className="flex items-center gap-1 px-2 shrink-0 overflow-x-auto"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            height: 30,
            minHeight: 30,
          }}
        >
          {(
            [
              { label: "Auto", w: null,  h: null  },
              { label: "375",  w: 375,   h: 812   },
              { label: "768",  w: 768,   h: 1024  },
              { label: "1280", w: 1280,  h: 800   },
              { label: "1440", w: 1440,  h: 900   },
            ] as { label: string; w: number | null; h: number | null }[]
          ).map((preset) => {
            const isActive = !customActive && viewportW === preset.w && viewportH === preset.h;
            return (
              <button
                key={preset.label}
                onClick={() => { setViewportW(preset.w); setViewportH(preset.h); setCustomActive(false); }}
                className="shrink-0 rounded transition-colors"
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-muted)",
                }}
              >
                {preset.label}
              </button>
            );
          })}

          <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 3px", flexShrink: 0 }} />

          <input
            type="number"
            value={customW}
            min={100}
            max={3840}
            title="Custom width (px)"
            onChange={(e) => {
              setCustomW(e.target.value);
              const w = parseInt(e.target.value);
              const h = parseInt(customH);
              if (w > 0 && h > 0) { setViewportW(w); setViewportH(h); setCustomActive(true); }
            }}
            style={{
              width: 64, fontSize: 11, textAlign: "center",
              padding: "1px 4px", borderRadius: 3, outline: "none",
              background: customActive ? "rgba(91,141,239,0.12)" : "var(--surface)",
              border: `1px solid ${customActive ? "var(--accent)" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>×</span>
          <input
            type="number"
            value={customH}
            min={100}
            max={2160}
            title="Custom height (px)"
            onChange={(e) => {
              setCustomH(e.target.value);
              const w = parseInt(customW);
              const h = parseInt(e.target.value);
              if (w > 0 && h > 0) { setViewportW(w); setViewportH(h); setCustomActive(true); }
            }}
            style={{
              width: 64, fontSize: 11, textAlign: "center",
              padding: "1px 4px", borderRadius: 3, outline: "none",
              background: customActive ? "rgba(91,141,239,0.12)" : "var(--surface)",
              border: `1px solid ${customActive ? "var(--accent)" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginLeft: 1 }}>px</span>
        </div>
      )}

      {/* Drop zone / preview */}
      <div
        ref={contentAreaRef}
        className="flex-1 relative"
        onMouseMove={handleContentMouseMove}
        onMouseLeave={handleContentMouseLeave}
      >
        {/* Scrollable content area */}
        <div className="absolute inset-0 overflow-auto scrollbar-thin">
          {lane.asset ? (
            <FilePreview
              key={refreshKey}
              asset={lane.asset}
              zoom={zoom}
              viewportW={viewportW}
              viewportH={viewportH}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer select-none"
              style={{ color: dragging ? "var(--accent)" : "var(--text-muted)" }}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors"
                style={{
                  border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                  background: dragging ? "var(--accent)11" : "var(--surface-2)",
                }}
              >
                {dragging ? "↓" : "+"}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop file or folder here</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  or{" "}
                  <span
                    className="underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  >
                    browse file
                  </span>
                  {" / "}
                  <span
                    className="underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  >
                    open folder
                  </span>
                  {" / "}
                  <span
                    className="underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); }}
                  >
                    paste URL
                  </span>
                </p>
              </div>
              <div className="text-xs text-center" style={{ color: "var(--border)" }}>
                JPG · PNG · GIF · WEBP · SVG<br />MP4 · WEBM · PDF · HTML · Folder
              </div>
            </div>
          )}

          {/* Drag overlay when asset loaded */}
          {lane.asset && (
            <div
              className="absolute inset-0"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                background: dragging ? "var(--accent)22" : "transparent",
                border: dragging ? "2px dashed var(--accent)" : "none",
                pointerEvents: dragging ? "auto" : "none",
                transition: "all 0.15s ease",
              }}
            />
          )}
        </div>

        {/* Transparent overlay to capture mouse events over iframes when guides are active */}
        {showGuides && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 10, cursor: "crosshair" }}
            onMouseMove={handleContentMouseMove}
            onMouseLeave={handleContentMouseLeave}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onAddStickyGuide?.(
                (e.clientX - rect.left) / rect.width,
                (e.clientY - rect.top) / rect.height,
              );
            }}
          />
        )}

        {/* Cursor crosshair (ephemeral) */}
        {showGuides && cursorPos && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            <div
              style={{
                position: "absolute", left: 0, right: 0,
                top: `${cursorPos.y * 100}%`, height: 1,
                background: "rgba(255, 220, 30, 0.5)",
                transform: "translateY(-0.5px)",
              }}
            />
            <div
              style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${cursorPos.x * 100}%`, width: 1,
                background: "rgba(255, 220, 30, 0.5)",
                transform: "translateX(-0.5px)",
              }}
            />
            <div
              style={{
                position: "absolute", top: 4, right: 4,
                background: "rgba(0,0,0,0.7)",
                color: "rgba(255, 220, 30, 1)",
                fontSize: 10, padding: "2px 5px", borderRadius: 3,
                fontFamily: "monospace", lineHeight: 1.5, whiteSpace: "nowrap",
              }}
            >
              {Math.round(cursorPos.x * 100)}% · {Math.round(cursorPos.y * 100)}%
            </div>
          </div>
        )}

        {/* Sticky guides */}
        {showGuides && stickyGuides.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            {stickyGuides.map((g) => (
              <div key={g.id}>
                <div
                  style={{
                    position: "absolute", left: 0, right: 0,
                    top: `${g.y * 100}%`, height: 1,
                    background: g.color,
                    boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                    transform: "translateY(-0.5px)",
                  }}
                />
                <div
                  style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: `${g.x * 100}%`, width: 1,
                    background: g.color,
                    boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                    transform: "translateX(-0.5px)",
                  }}
                />
                {/* Intersection handle — needs pointer events */}
                <div
                  style={{
                    position: "absolute",
                    left: `${g.x * 100}%`,
                    top: `${g.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "auto",
                    zIndex: 25,
                  }}
                  onMouseEnter={() => setHoveredGuideId(g.id)}
                  onMouseLeave={() => { if (colorPickingId !== g.id) setHoveredGuideId(null); }}
                >
                  {(hoveredGuideId === g.id || colorPickingId === g.id) ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {/* Color picker */}
                      <div style={{ position: "relative", width: 16, height: 16 }}>
                        <input
                          type="color"
                          value={g.color}
                          onChange={(e) => onUpdateStickyGuide?.(g.id, e.target.value)}
                          onFocus={() => setColorPickingId(g.id)}
                          onBlur={() => { setColorPickingId(null); setHoveredGuideId(null); }}
                          style={{
                            position: "absolute", inset: 0,
                            opacity: 0, width: "100%", height: "100%",
                            cursor: "pointer", border: "none", padding: 0,
                          }}
                          title="Change guide color"
                        />
                        <div
                          style={{
                            width: 16, height: 16, borderRadius: "50%",
                            background: g.color,
                            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.5)",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                      {/* Delete */}
                      <button
                        onClick={() => onRemoveStickyGuide?.(g.id)}
                        style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: "rgba(30,30,30,0.85)",
                          border: "1.5px solid rgba(255,255,255,0.3)",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: "#fff", fontWeight: "bold", lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: g.color,
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File info bar */}
      {lane.asset && (
        <div
          className="px-3 py-1.5 text-xs shrink-0 flex items-center justify-between gap-2"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            background: "var(--surface-2)",
          }}
        >
          <span
            className="truncate min-w-0"
            title={lane.asset.folderName ?? lane.asset.displayName ?? lane.asset.file?.name}
          >
            {lane.asset.folderName
              ? `${lane.asset.folderName}/ (${lane.asset.fileCount} files)`
              : (lane.asset.displayName ?? lane.asset.file?.name ?? "")}
          </span>
          {lane.asset.type === "html" && htmlDimensions ? (
            <span
              className="shrink-0 font-mono tabular-nums"
              style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.7 }}
            >
              {htmlDimensions.w} × {htmlDimensions.h} px
            </span>
          ) : lane.asset.file ? (
            <span className="shrink-0">
              ({(lane.asset.file.size / 1024).toFixed(0)} KB)
            </span>
          ) : null}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED, ".html"].join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        onChange={handleFolderInput}
      />
    </div>
  );
}
