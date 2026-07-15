"use client";

import { useRef, useState, useEffect, MouseEvent, TouchEvent } from "react";
import { LaneData, CursorPos } from "./ComparisonTool";

interface Props {
  laneA: LaneData;
  laneB: LaneData;
  zoom: number;
  showGuides?: boolean;
  cursorPos?: CursorPos;
  onCursorMove?: (pos: CursorPos) => void;
  showMagnifier?: boolean;
  magnifierZoom?: number;
  onMagnifierZoomChange?: (delta: number) => void;
}

const MAGNIFIER_SIZE = 180;

export default function SliderComparison({
  laneA,
  laneB,
  zoom,
  showGuides,
  cursorPos,
  onCursorMove,
  showMagnifier,
  magnifierZoom = 3,
  onMagnifierZoomChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);

  const getMagnifierLens = () => {
    if (!showMagnifier || !cursorPos) return null;
    const contRect = containerRef.current?.getBoundingClientRect();
    if (!contRect) return null;

    const cursorPxX = cursorPos.x * contRect.width;
    const cursorPxY = cursorPos.y * contRect.height;
    const onLeftSide = (cursorPxX / contRect.width) * 100 < splitPct;
    const activeImg = onLeftSide ? imgARef.current : imgBRef.current;
    const activeAsset = onLeftSide ? laneA.asset : laneB.asset;
    if (!activeImg || !activeAsset) return null;

    const imgRect = activeImg.getBoundingClientRect();
    if (imgRect.width === 0 || imgRect.height === 0) return null;
    const imgLeft = imgRect.left - contRect.left;
    const imgTop = imgRect.top - contRect.top;

    const ix = (cursorPxX - imgLeft) / imgRect.width;
    const iy = (cursorPxY - imgTop) / imgRect.height;
    if (ix < 0 || ix > 1 || iy < 0 || iy > 1) return null;

    const bgWidth = imgRect.width * magnifierZoom;
    const bgHeight = imgRect.height * magnifierZoom;

    return {
      left: cursorPxX - MAGNIFIER_SIZE / 2,
      top: cursorPxY - MAGNIFIER_SIZE / 2,
      bgWidth,
      bgHeight,
      bgPosX: -(ix * bgWidth) + MAGNIFIER_SIZE / 2,
      bgPosY: -(iy * bgHeight) + MAGNIFIER_SIZE / 2,
      url: activeAsset.url,
    };
  };

  // Native (non-passive) listener so preventDefault actually stops the panel from scrolling while adjusting loupe zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: globalThis.WheelEvent) => {
      if (!showMagnifier || !onMagnifierZoomChange) return;
      e.preventDefault();
      onMagnifierZoomChange(e.deltaY > 0 ? -0.25 : 0.25);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [showMagnifier, onMagnifierZoomChange]);

  const updateSplit = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(2, Math.min(98, pct)));
  };

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const move = (ev: globalThis.MouseEvent) => updateSplit(ev.clientX);
    const up = () => {
      setDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onTouchMove = (e: TouchEvent) => {
    updateSplit(e.touches[0].clientX);
  };

  const imgStyle = {
    width: `${zoom * 100}%`,
    height: "auto",
    maxWidth: "none",
    objectFit: "contain" as const,
    display: "block",
    userSelect: "none" as const,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Labels */}
      <div
        className="flex justify-between px-4 py-2 text-xs font-medium shrink-0"
        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="px-2 py-1 rounded"
          style={{ background: "var(--surface-2)" }}
        >
          ← {laneA.label}
        </span>
        <span
          className="px-2 py-1 rounded"
          style={{ background: "var(--surface-2)" }}
        >
          {laneB.label} →
        </span>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ cursor: dragging ? "col-resize" : "default" }}
        onTouchMove={onTouchMove}
        onMouseMove={(e) => {
          if (!showGuides && !showMagnifier) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onCursorMove?.({
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
          });
        }}
        onMouseLeave={() => { if (showGuides || showMagnifier) onCursorMove?.(null); }}
      >
        {/* Image B (right, full width) */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgBRef} src={laneB.asset!.url} alt={laneB.label} style={imgStyle} draggable={false} />
        </div>

        {/* Image A (left, clipped) */}
        <div
          className="absolute inset-0 overflow-hidden flex items-center justify-center"
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgARef} src={laneA.asset!.url} alt={laneA.label} style={imgStyle} draggable={false} />
        </div>

        {/* Divider line */}
        <div
          className="absolute inset-y-0 w-0.5 z-10"
          style={{ left: `${splitPct}%`, background: "white", boxShadow: "0 0 4px rgba(0,0,0,0.6)" }}
        />

        {/* Guide lines */}
        {showGuides && cursorPos && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            <div
              style={{
                position: "absolute",
                left: 0, right: 0,
                top: `${cursorPos.y * 100}%`,
                height: 1,
                background: "rgba(255, 220, 30, 0.9)",
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                transform: "translateY(-0.5px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0, bottom: 0,
                left: `${cursorPos.x * 100}%`,
                width: 1,
                background: "rgba(255, 220, 30, 0.9)",
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
                transform: "translateX(-0.5px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${cursorPos.x * 100}%`,
                top: `${cursorPos.y * 100}%`,
                width: 7, height: 7,
                borderRadius: "50%",
                background: "rgba(255, 220, 30, 1)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                transform: "translate(-50%, -50%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 4, right: 4,
                background: "rgba(0,0,0,0.7)",
                color: "rgba(255, 220, 30, 1)",
                fontSize: 10,
                padding: "2px 5px",
                borderRadius: 3,
                fontFamily: "monospace",
                lineHeight: 1.5,
                whiteSpace: "nowrap",
              }}
            >
              {Math.round(cursorPos.x * 100)}% · {Math.round(cursorPos.y * 100)}%
            </div>
          </div>
        )}

        {/* Drag handle */}
        <div
          className="absolute z-20 flex items-center justify-center rounded-full"
          style={{
            left: `${splitPct}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 36,
            height: 36,
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            cursor: "col-resize",
          }}
          onMouseDown={onMouseDown}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4l-3 5 3 5M12 4l3 5-3 5" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Magnifier loupe */}
        {(() => {
          const lens = getMagnifierLens();
          if (!lens) return null;
          return (
            <div
              className="absolute pointer-events-none rounded-full overflow-hidden"
              style={{
                zIndex: 30,
                left: lens.left,
                top: lens.top,
                width: MAGNIFIER_SIZE,
                height: MAGNIFIER_SIZE,
                border: "2px solid rgba(255,255,255,0.85)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                backgroundImage: `url(${lens.url})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${lens.bgWidth}px ${lens.bgHeight}px`,
                backgroundPosition: `${lens.bgPosX}px ${lens.bgPosY}px`,
              }}
            >
              <div
                className="absolute"
                style={{ left: "50%", top: "50%", width: 1, height: 10, background: "rgba(255,220,30,0.9)", transform: "translate(-50%, -50%)" }}
              />
              <div
                className="absolute"
                style={{ left: "50%", top: "50%", width: 10, height: 1, background: "rgba(255,220,30,0.9)", transform: "translate(-50%, -50%)" }}
              />
              <div
                className="absolute"
                style={{
                  left: 4, bottom: 4,
                  background: "rgba(0,0,0,0.7)", color: "#fff",
                  fontSize: 9, padding: "1px 4px", borderRadius: 3,
                  fontFamily: "monospace",
                }}
              >
                {magnifierZoom.toFixed(1)}x
              </div>
            </div>
          );
        })()}
      </div>

      {/* Hint */}
      <div
        className="px-4 py-2 text-xs text-center shrink-0"
        style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
      >
        Drag the handle to compare · Using first two loaded lanes
      </div>
    </div>
  );
}
