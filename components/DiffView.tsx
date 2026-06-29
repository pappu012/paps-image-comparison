"use client";

import { useEffect, useState } from "react";
import pixelmatch from "pixelmatch";
import { LaneData } from "./ComparisonTool";
import { analyzeDiff, type DiffAnalysis } from "@/lib/diffAnalysis";

interface Props {
  lanes: LaneData[];
  zoom: number;
}

interface DiffState {
  status: "idle" | "loading" | "done" | "error";
  diffUrl?: string;
  diffPixels?: number;
  totalPixels?: number;
  pct?: number;
  width?: number;
  height?: number;
  analysis?: DiffAnalysis;
  error?: string;
}

async function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function drawToImageData(img: HTMLImageElement, w: number, h: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function severityLabel(pct: number) {
  if (pct === 0) return { label: "Identical", color: "#4caf50" };
  if (pct < 1) return { label: "Minor diff", color: "#8bc34a" };
  if (pct < 5) return { label: "Moderate", color: "#ffc107" };
  if (pct < 20) return { label: "Significant", color: "#ff9800" };
  return { label: "Major diff", color: "#f44336" };
}

function describeChange(pct: number, diffPixels: number, totalPixels: number, labelA: string, labelB: string): string {
  if (pct === 0) return `${labelA} and ${labelB} are pixel-perfect identical — no differences detected.`;
  const pctStr = pct < 0.1 ? pct.toFixed(3) : pct.toFixed(2);
  const base = `${diffPixels.toLocaleString()} of ${totalPixels.toLocaleString()} pixels (${pctStr}%) differ between ${labelA} and ${labelB}.`;
  if (pct < 0.5) return `${base} Likely anti-aliasing, sub-pixel rendering, or minor compression artefacts.`;
  if (pct < 2)   return `${base} Minor visual differences — possibly font rendering, shadow edges, or small layout shifts.`;
  if (pct < 5)   return `${base} Moderate differences — check for colour changes, spacing adjustments, or content updates.`;
  if (pct < 20)  return `${base} Significant differences — likely a layout change, element repositioning, or different content.`;
  return `${base} Major differences — the images appear substantially different in composition or content.`;
}

export default function DiffView({ lanes, zoom }: Props) {
  const imageLanes = lanes.filter((l) => l.asset?.type === "image");

  const [laneAId, setLaneAId] = useState(imageLanes[0]?.id ?? "");
  const [laneBId, setLaneBId] = useState(imageLanes[1]?.id ?? "");
  const [threshold, setThreshold] = useState(0.1);
  const [diff, setDiff] = useState<DiffState>({ status: "idle" });

  const laneA = lanes.find((l) => l.id === laneAId);
  const laneB = lanes.find((l) => l.id === laneBId);

  // Sync selectors when lanes change
  useEffect(() => {
    if (imageLanes.length >= 1 && !imageLanes.find((l) => l.id === laneAId)) {
      setLaneAId(imageLanes[0]?.id ?? "");
    }
    if (imageLanes.length >= 2 && !imageLanes.find((l) => l.id === laneBId)) {
      setLaneBId(imageLanes[1]?.id ?? "");
    }
  }, [imageLanes, laneAId, laneBId]);

  useEffect(() => {
    if (!laneA?.asset || !laneB?.asset) {
      setDiff({ status: "idle" });
      return;
    }
    if (laneAId === laneBId) {
      setDiff({ status: "error", error: "Select two different lanes to compare." });
      return;
    }

    let cancelled = false;
    setDiff({ status: "loading" });

    (async () => {
      try {
        const [imgA, imgB] = await Promise.all([
          loadImg(laneA.asset!.url),
          loadImg(laneB.asset!.url),
        ]);
        if (cancelled) return;

        const w = Math.max(imgA.naturalWidth, imgB.naturalWidth);
        const h = Math.max(imgA.naturalHeight, imgB.naturalHeight);

        const dataA = drawToImageData(imgA, w, h);
        const dataB = drawToImageData(imgB, w, h);
        const diffArr = new Uint8ClampedArray(w * h * 4);

        const diffPixels = pixelmatch(dataA.data, dataB.data, diffArr, w, h, {
          threshold,
          includeAA: false,
          alpha: 0.2,
          diffColor: [255, 50, 50],
          diffColorAlt: [50, 50, 255],
        });

        if (cancelled) return;

        const diffCanvas = document.createElement("canvas");
        diffCanvas.width = w;
        diffCanvas.height = h;
        diffCanvas.getContext("2d")!.putImageData(new ImageData(diffArr, w, h), 0, 0);

        setDiff({
          status: "done",
          diffUrl: diffCanvas.toDataURL("image/png"),
          diffPixels,
          totalPixels: w * h,
          pct: (diffPixels / (w * h)) * 100,
          width: w,
          height: h,
          analysis: analyzeDiff(diffArr, w, h),
        });
      } catch (err) {
        if (!cancelled) setDiff({ status: "error", error: String(err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [laneA, laneB, laneAId, laneBId, threshold]);

  const severity = diff.pct !== undefined ? severityLabel(diff.pct) : null;

  const imgStyle = (url: string) => ({
    src: url,
    style: {
      width: `${zoom * 100}%`,
      height: "auto",
      maxWidth: "none",
      objectFit: "contain" as const,
      display: "block",
    } as React.CSSProperties,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div
        className="flex items-center gap-4 px-4 py-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        {/* Lane selectors */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Compare</span>
          <LaneSelect
            value={laneAId}
            lanes={imageLanes}
            exclude={laneBId}
            onChange={setLaneAId}
          />
          <span style={{ color: "var(--text-muted)" }}>vs</span>
          <LaneSelect
            value={laneBId}
            lanes={imageLanes}
            exclude={laneAId}
            onChange={setLaneBId}
          />
        </div>

        <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

        {/* Threshold */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Sensitivity</span>
          <input
            type="range"
            min={0.01}
            max={0.3}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24"
            title={`Threshold: ${threshold}`}
          />
          <span className="w-8">{Math.round((1 - threshold) * 100)}%</span>
        </div>

        {/* Stats */}
        {diff.status === "done" && severity && (
          <>
            <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-2 text-xs">
              <span
                className="px-2 py-0.5 rounded font-semibold"
                style={{ background: severity.color + "22", color: severity.color }}
              >
                {severity.label}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {diff.diffPixels!.toLocaleString()} px different
              </span>
              <span
                className="font-mono font-bold"
                style={{ color: severity.color }}
              >
                {diff.pct!.toFixed(2)}%
              </span>
              <span style={{ color: "var(--border)" }}>of</span>
              <span style={{ color: "var(--text-muted)" }}>
                {diff.width}×{diff.height}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Panels */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Lane A */}
        <Panel label={laneA?.label ?? "—"} tag="A" tagColor="var(--accent)">
          {laneA?.asset?.type === "image" ? (
            <div className="flex items-center justify-center w-full h-full overflow-auto scrollbar-thin p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...imgStyle(laneA.asset.url)}
                alt={laneA.label}
                draggable={false}
              />
            </div>
          ) : (
            <EmptyPanel message="No image loaded in this lane" />
          )}
        </Panel>

        {/* Diff */}
        <Panel
          label="Diff"
          tag={
            diff.status === "loading"
              ? "…"
              : diff.status === "done"
              ? `${diff.pct!.toFixed(1)}%`
              : "—"
          }
          tagColor={severity?.color ?? "var(--text-muted)"}
        >
          {diff.status === "idle" && (
            <EmptyPanel message="Select two image lanes above" />
          )}
          {diff.status === "loading" && (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-muted)" }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent) transparent var(--accent) var(--accent)" }} />
              <span className="text-sm">Computing diff…</span>
            </div>
          )}
          {diff.status === "error" && (
            <EmptyPanel message={diff.error ?? "Error computing diff"} isError />
          )}
          {diff.status === "done" && diff.diffUrl && (
            <div className="flex items-center justify-center w-full h-full overflow-auto scrollbar-thin p-2">
              {diff.pct === 0 ? (
                <div className="flex flex-col items-center gap-3" style={{ color: "#4caf50" }}>
                  <span className="text-5xl">✓</span>
                  <span className="text-sm font-medium">Images are identical</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={diff.diffUrl}
                    alt="Diff"
                    draggable={false}
                    style={{
                      width: `${zoom * 100}%`,
                      height: "auto",
                      maxWidth: "none",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Red = different · Blue = anti-aliasing · Faded = same
                  </span>
                  <div
                    style={{
                      marginTop: 8,
                      maxWidth: 400,
                      width: "100%",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      overflow: "hidden",
                      fontSize: 11,
                    }}
                  >
                    {/* Summary sentence */}
                    <div style={{ padding: "10px 14px", color: "var(--text-muted)", lineHeight: 1.6, borderBottom: diff.analysis ? "1px solid var(--border)" : "none" }}>
                      {describeChange(diff.pct!, diff.diffPixels!, diff.totalPixels!, laneA?.label ?? "A", laneB?.label ?? "B")}
                    </div>

                    {/* Analysis tags */}
                    {diff.analysis && diff.analysis.dominantTypes.length > 0 && (
                      <div style={{ padding: "8px 14px", display: "flex", flexWrap: "wrap", gap: 6, borderBottom: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text-muted)", marginRight: 2, alignSelf: "center" }}>Change type:</span>
                        {diff.analysis.dominantTypes.map((t) => (
                          <span key={t} style={{
                            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                            padding: "2px 8px", borderRadius: 3,
                            background: "rgba(91,141,239,0.12)", color: "rgba(91,141,239,1)",
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Breakdown row */}
                    {diff.analysis && (
                      <div style={{ padding: "8px 14px", display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <StatChip label="Region" value={diff.analysis.regions.join(", ")} />
                        <StatChip label="Changed px" value={diff.analysis.redPixels.toLocaleString()} />
                        <StatChip label="AA px" value={diff.analysis.bluePixels.toLocaleString()} />
                        <StatChip label="AA ratio" value={`${Math.round(diff.analysis.aaRatio * 100)}%`} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Lane B */}
        <Panel label={laneB?.label ?? "—"} tag="B" tagColor="#e8965a">
          {laneB?.asset?.type === "image" ? (
            <div className="flex items-center justify-center w-full h-full overflow-auto scrollbar-thin p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...imgStyle(laneB.asset.url)}
                alt={laneB.label}
                draggable={false}
              />
            </div>
          ) : (
            <EmptyPanel message="No image loaded in this lane" />
          )}
        </Panel>
      </div>

      {/* Legend */}
      <div
        className="px-4 py-2 text-xs flex items-center gap-4 shrink-0"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--surface-2)" }}
      >
        <LegendDot color="#ff3232" label="Different pixels" />
        <LegendDot color="#3232ff" label="Anti-aliasing" />
        <LegendDot color="rgba(128,128,128,0.3)" label="Same (faded)" />
        <span className="ml-auto">Adjust sensitivity to tune false positives</span>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--border)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ background: color, border: "1px solid rgba(255,255,255,0.1)" }}
      />
      {label}
    </span>
  );
}

function Panel({
  label,
  tag,
  tagColor,
  children,
}: {
  label: string;
  tag: string;
  tagColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col flex-1 min-w-0"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0 text-sm font-medium"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        <span style={{ color: "var(--text)" }}>{label}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{ background: tagColor + "22", color: tagColor }}
        >
          {tag}
        </span>
      </div>
      <div className="flex-1 overflow-hidden" style={{ background: "var(--surface)" }}>
        {children}
      </div>
    </div>
  );
}

function EmptyPanel({ message, isError }: { message: string; isError?: boolean }) {
  return (
    <div
      className="flex items-center justify-center h-full text-sm text-center px-4"
      style={{ color: isError ? "#e57373" : "var(--text-muted)" }}
    >
      {message}
    </div>
  );
}

function LaneSelect({
  value,
  lanes,
  exclude,
  onChange,
}: {
  value: string;
  lanes: LaneData[];
  exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm rounded px-2 py-1 outline-none"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      {lanes.length === 0 && (
        <option value="">No images loaded</option>
      )}
      {lanes.map((l) => (
        <option key={l.id} value={l.id} disabled={l.id === exclude}>
          {l.label} {l.id === exclude ? "(in use)" : ""}
        </option>
      ))}
    </select>
  );
}
