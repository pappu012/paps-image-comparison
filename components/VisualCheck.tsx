"use client";

import { useEffect, useState } from "react";
import pixelmatch from "pixelmatch";
import { LaneData } from "./ComparisonTool";
import { analyzeDiff, type DiffAnalysis } from "@/lib/diffAnalysis";

// ─── Types & utilities ────────────────────────────────────────────────────────

type RenderStatus = "loading" | "ok" | "error" | "empty";

interface PairResult {
  aId: string;
  bId: string;
  status: "pending" | "computing" | "done" | "error";
  matchPct?: number;
  diffPct?: number;
  analysis?: DiffAnalysis;
  error?: string;
}

function statusColor(s: RenderStatus): string {
  if (s === "ok")      return "#4ade80";
  if (s === "error")   return "#f87171";
  if (s === "loading") return "#fbbf24";
  return "var(--text-muted)";
}

function matchSeverity(pct: number): { label: string; color: string } {
  if (pct >= 99.9) return { label: "Identical",  color: "#4ade80" };
  if (pct >= 99)   return { label: "Near match", color: "#86efac" };
  if (pct >= 95)   return { label: "Minor diff", color: "#fbbf24" };
  if (pct >= 80)   return { label: "Moderate",   color: "#fb923c" };
  return                  { label: "Major diff", color: "#f87171" };
}

function describeOverall(filled: number, okCount: number, pairs: PairResult[]): string {
  if (filled === 0) return "Load assets into lanes to begin the check.";
  const failing = filled - okCount;
  if (failing > 0) return `${failing} asset${failing !== 1 ? "s" : ""} still loading or failed to render.`;
  if (pairs.length === 0) return "All assets rendered successfully. Add 2 or more images to compare them.";
  const pairsDone = pairs.filter(p => p.status === "done");
  if (pairsDone.length < pairs.length) {
    const rem = pairs.length - pairsDone.length;
    return `All assets rendered OK. Computing ${rem} remaining comparison${rem !== 1 ? "s" : ""}…`;
  }
  const worst = Math.min(...pairsDone.map(p => p.matchPct ?? 100));
  if (worst >= 99.9) return "All assets rendered successfully and are pixel-perfect identical.";
  if (worst >= 99)   return "All assets rendered OK. Differences are minimal — likely sub-pixel rendering artefacts.";
  if (worst >= 95)   return "All assets rendered OK. Minor differences detected — review the comparisons below.";
  if (worst >= 80)   return "All assets rendered OK. Moderate differences found — some renders differ noticeably.";
  return "All assets rendered OK. Significant differences found — review the comparisons below.";
}

function describePair(matchPct: number, labelA: string, labelB: string): string {
  if (matchPct >= 99.9) return `${labelA} and ${labelB} are pixel-perfect — no meaningful differences detected.`;
  if (matchPct >= 99)   return `Virtually identical. Tiny differences likely from sub-pixel rendering or anti-aliasing.`;
  if (matchPct >= 95)   return `Minor differences — possibly font rendering, shadow edges, or subtle layout shifts.`;
  if (matchPct >= 80)   return `Noticeable differences — check for colour changes, spacing adjustments, or content updates.`;
  return `Significant differences — these renders appear substantially different in layout or content.`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Load failed"));
    img.src = url;
  });
}

function toImageData(img: HTMLImageElement, w: number, h: number): ImageData {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

async function computePair(urlA: string, urlB: string): Promise<{ matchPct: number; diffPct: number; analysis: DiffAnalysis }> {
  const [imgA, imgB] = await Promise.all([loadImg(urlA), loadImg(urlB)]);
  const w = Math.max(imgA.naturalWidth, imgB.naturalWidth);
  const h = Math.max(imgA.naturalHeight, imgB.naturalHeight);
  const dataA = toImageData(imgA, w, h);
  const dataB = toImageData(imgB, w, h);
  const diffArr = new Uint8ClampedArray(w * h * 4);
  const diffPixels = pixelmatch(dataA.data, dataB.data, diffArr, w, h, {
    threshold: 0.1,
    includeAA: false,
    diffColor: [255, 50, 50],
    diffColorAlt: [50, 50, 255],
  });
  const diffPct = (diffPixels / (w * h)) * 100;
  return { matchPct: 100 - diffPct, diffPct, analysis: analyzeDiff(diffArr, w, h) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap",
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function Thumb({
  asset,
  label,
  labelSide = "left",
  onLoad,
  onError,
}: {
  asset: LaneData["asset"];
  label?: string;
  labelSide?: "left" | "right";
  onLoad?: () => void;
  onError?: () => void;
}) {
  return (
    <div style={{
      flex: 1, overflow: "hidden", background: "var(--surface-2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", minHeight: 0,
    }}>
      {asset?.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.file?.name ?? ""}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          onLoad={onLoad}
          onError={onError}
        />
      ) : asset?.type === "video" ? (
        <span style={{ fontSize: 22, color: "var(--text-muted)" }}>▶</span>
      ) : asset?.type === "pdf" ? (
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "var(--text-muted)", letterSpacing: "0.05em" }}>PDF</span>
      ) : asset?.type === "html" ? (
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "var(--text-muted)", letterSpacing: "0.05em" }}>HTML</span>
      ) : (
        <span style={{ fontSize: 22, color: "var(--border)" }}>·</span>
      )}
      {label && (
        <div style={{
          position: "absolute", top: 7, [labelSide]: 9,
          fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.45)",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lanes: LaneData[];
}

export default function VisualCheck({ lanes }: Props) {
  const [imgStatus, setImgStatus] = useState<Record<string, "ok" | "error">>({});
  const [pairs, setPairs] = useState<PairResult[]>([]);

  const imageLanes = lanes.filter(l => l.asset?.type === "image");

  useEffect(() => {
    const next: PairResult[] = [];
    for (let i = 0; i < imageLanes.length; i++)
      for (let j = i + 1; j < imageLanes.length; j++)
        next.push({ aId: imageLanes[i].id, bId: imageLanes[j].id, status: "pending" });
    setPairs(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLanes.map(l => l.id + (l.asset?.id ?? "")).join(",")]);

  useEffect(() => {
    let cancelled = false;
    pairs.forEach(pair => {
      if (pair.status !== "pending") return;
      const laneA = imageLanes.find(l => l.id === pair.aId);
      const laneB = imageLanes.find(l => l.id === pair.bId);
      if (!laneA?.asset || !laneB?.asset) return;
      const { url: urlA } = laneA.asset;
      const { url: urlB } = laneB.asset;
      setPairs(p => p.map(x => x.aId === pair.aId && x.bId === pair.bId ? { ...x, status: "computing" } : x));
      computePair(urlA, urlB)
        .then(({ matchPct, diffPct, analysis }) => {
          if (!cancelled) setPairs(p => p.map(x => x.aId === pair.aId && x.bId === pair.bId ? { ...x, status: "done", matchPct, diffPct, analysis } : x));
        })
        .catch(err => {
          if (!cancelled) setPairs(p => p.map(x => x.aId === pair.aId && x.bId === pair.bId ? { ...x, status: "error", error: String(err) } : x));
        });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.map(p => p.aId + p.bId + p.status).join(",")]);

  function laneStatus(lane: LaneData): RenderStatus {
    if (!lane.asset) return "empty";
    if (lane.asset.type === "image") return imgStatus[lane.asset.id] ?? "loading";
    return "ok";
  }

  const filled   = lanes.filter(l => l.asset !== null);
  const okCount  = lanes.filter(l => laneStatus(l) === "ok").length;
  const allOk    = filled.length > 0 && okCount === filled.length;
  const pairsDone = pairs.filter(p => p.status === "done").length;
  const summaryColor = allOk ? "#4ade80" : filled.length === 0 ? "var(--text-muted)" : "#fbbf24";

  return (
    <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", background: "var(--bg)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 32px 56px" }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: 36, paddingBottom: 28, borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", marginTop: 6, flexShrink: 0,
              background: summaryColor,
              boxShadow: allOk ? "0 0 0 3px rgba(74,222,128,0.15)" : "none",
              transition: "box-shadow 0.3s ease",
            }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
                Render Check
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {lanes.length} lane{lanes.length !== 1 ? "s" : ""} · {filled.length} loaded
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 340 }}>
                {describeOverall(filled.length, okCount, pairs)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 30, fontWeight: 700, lineHeight: 1,
                fontFamily: "ui-monospace, 'SF Mono', monospace",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.04em",
                color: allOk ? "#4ade80" : "var(--text)",
                transition: "color 0.3s ease",
              }}>
                {okCount}/{lanes.length}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Renders OK
              </div>
            </div>
            {pairs.length > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 30, fontWeight: 700, lineHeight: 1,
                  fontFamily: "ui-monospace, 'SF Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.04em",
                  color: "var(--text)",
                }}>
                  {pairsDone}/{pairs.length}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Pairs done
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Renders table ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>Renders</SectionLabel>
          <div>
            {lanes.map((lane, idx) => {
              const asset  = lane.asset;
              const status = laneStatus(lane);
              const sc     = statusColor(status);
              const labels = { ok: "OK", error: "Error", loading: "Loading", empty: "—" } as const;
              const icons  = { ok: "✓",  error: "✕",     loading: "·",       empty: "—" } as const;
              const size   = asset?.file ? formatSize(asset.file.size) : "—";

              return (
                <div
                  key={lane.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 56px 1fr 64px 72px",
                    alignItems: "center",
                    columnGap: 14,
                    padding: "11px 0",
                    borderBottom: idx < lanes.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  {/* Index */}
                  <div style={{
                    fontSize: 11, textAlign: "right",
                    fontFamily: "ui-monospace, 'SF Mono', monospace",
                    color: "var(--text-muted)", opacity: 0.5,
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Thumbnail */}
                  <div style={{
                    width: 56, height: 36, borderRadius: 4, overflow: "hidden",
                    flexShrink: 0, background: "var(--surface-2)",
                    border: `1px solid ${status === "ok" ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {asset?.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.file?.name ?? ""}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        onLoad={() => setImgStatus(s => ({ ...s, [asset.id]: "ok" }))}
                        onError={() => setImgStatus(s => ({ ...s, [asset.id]: "error" }))}
                      />
                    ) : asset?.type === "video" ? <span style={{ fontSize: 14, color: "var(--text-muted)" }}>▶</span>
                      : asset?.type === "pdf"   ? <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: "var(--text-muted)" }}>PDF</span>
                      : asset?.type === "html"  ? <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: "var(--text-muted)" }}>HTML</span>
                      : <span style={{ fontSize: 18, color: "var(--border)" }}>·</span>
                    }
                  </div>

                  {/* Label + filename */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lane.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                      {asset ? (asset.file?.name ?? asset.displayName ?? asset.url) : "No file loaded"}
                    </div>
                  </div>

                  {/* File size */}
                  <div style={{
                    fontSize: 11, textAlign: "right",
                    fontFamily: "ui-monospace, 'SF Mono', monospace",
                    color: "var(--text-muted)",
                  }}>
                    {size}
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                    <span style={{ color: sc, fontSize: 13, lineHeight: 1 }}>{icons[status]}</span>
                    <span style={{ fontSize: 11, color: sc, fontWeight: 500 }}>{labels[status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Compare ───────────────────────────────────────────────────── */}
        {pairs.length > 0 && (
          <div>
            <SectionLabel>Compare</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pairs.map(pair => {
                const laneA = lanes.find(l => l.id === pair.aId);
                const laneB = lanes.find(l => l.id === pair.bId);
                const sv    = pair.matchPct !== undefined ? matchSeverity(pair.matchPct) : null;
                const computing = pair.status === "computing" || pair.status === "pending";

                return (
                  <div
                    key={`${pair.aId}-${pair.bId}`}
                    style={{
                      borderRadius: 6, overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    {/* Split image panel */}
                    <div style={{ display: "flex", height: 240, borderBottom: "1px solid var(--border)" }}>
                      <Thumb
                        asset={laneA?.asset ?? null}
                        label={laneA?.label}
                        labelSide="left"
                      />
                      <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />
                      <Thumb
                        asset={laneB?.asset ?? null}
                        label={laneB?.label}
                        labelSide="right"
                      />
                    </div>

                    {/* Bar + stats */}
                    <div style={{ padding: "12px 16px" }}>
                      {/* Bar track */}
                      <div style={{
                        height: 4, borderRadius: 2, marginBottom: 10,
                        background: "var(--surface-2)", overflow: "hidden",
                      }}>
                        {pair.status === "done" && pair.matchPct !== undefined && sv ? (
                          <div style={{
                            height: "100%", borderRadius: 2,
                            width: `${pair.matchPct}%`,
                            background: sv.color,
                            transition: "width 0.5s ease",
                          }} />
                        ) : computing ? (
                          <div style={{
                            height: "100%", width: "40%", borderRadius: 2,
                            background: "var(--border)",
                            animation: "vc-shimmer 1.4s ease-in-out infinite",
                          }} />
                        ) : null}
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        {pair.status === "done" && pair.matchPct !== undefined && sv ? (
                          <>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              <span style={{
                                fontSize: 22, fontWeight: 700, lineHeight: 1,
                                fontFamily: "ui-monospace, 'SF Mono', monospace",
                                fontVariantNumeric: "tabular-nums",
                                letterSpacing: "-0.04em",
                                color: sv.color,
                              }}>
                                {pair.matchPct.toFixed(1)}%
                              </span>
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>match</span>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 500,
                              color: sv.color,
                              background: sv.color + "18",
                              padding: "2px 9px", borderRadius: 3,
                            }}>
                              {sv.label}
                            </span>
                          </>
                        ) : pair.status === "error" ? (
                          <span style={{ fontSize: 12, color: "#f87171" }}>Comparison failed</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {computing ? "Computing…" : "Pending"}
                          </span>
                        )}
                      </div>

                      {/* Analysis details */}
                      {pair.status === "done" && pair.matchPct !== undefined && (
                        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Summary sentence */}
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
                            {describePair(pair.matchPct, laneA?.label ?? "A", laneB?.label ?? "B")}
                          </p>

                          {/* Change type tags */}
                          {pair.analysis && pair.analysis.dominantTypes.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "var(--border)", marginRight: 2 }}>Change type:</span>
                              {pair.analysis.dominantTypes.map((t) => (
                                <span key={t} style={{
                                  fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                                  padding: "2px 7px", borderRadius: 3,
                                  background: "rgba(91,141,239,0.12)", color: "rgba(91,141,239,1)",
                                }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Stats row */}
                          {pair.analysis && (
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                              <VCStatChip label="Region" value={pair.analysis.regions.join(", ")} />
                              <VCStatChip label="Changed px" value={pair.analysis.redPixels.toLocaleString()} />
                              <VCStatChip label="AA px" value={pair.analysis.bluePixels.toLocaleString()} />
                              <VCStatChip label="AA ratio" value={`${Math.round(pair.analysis.aaRatio * 100)}%`} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {imageLanes.length < 2 && (
          <p style={{ fontSize: 12, color: "var(--border)", textAlign: "center", marginTop: 4 }}>
            Load 2 or more images to see compare rates
          </p>
        )}
      </div>
    </div>
  );
}

function VCStatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--border)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{value}</span>
    </div>
  );
}
