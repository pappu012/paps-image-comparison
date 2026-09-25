"use client";

import { Ref, useRef, useState, useEffect } from "react";
import { FileAsset } from "./ComparisonTool";

export default function HtmlPreview({
  asset,
  zoom,
  viewportW,
  viewportH,
  iframeRef,
}: {
  asset: FileAsset;
  zoom: number;
  viewportW?: number | null;
  viewportH?: number | null;
  iframeRef?: Ref<HTMLIFrameElement>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasViewport = viewportW != null && viewportH != null;

  let iframeW: number | string = "100%";
  let iframeH: number | string = "100%";
  let scale = zoom;
  let originX = 0;
  let originY = 0;

  if (hasViewport && containerSize.w > 0 && containerSize.h > 0) {
    const fitScale = Math.min(containerSize.w / viewportW!, containerSize.h / viewportH!);
    scale = fitScale * zoom;
    iframeW = viewportW!;
    iframeH = viewportH!;
    // Centre the scaled iframe in the container
    originX = (containerSize.w - viewportW! * scale) / 2;
    originY = (containerSize.h - viewportH! * scale) / 2;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}
    >
      <iframe
        ref={iframeRef}
        src={asset.url}
        title={asset.file?.name ?? asset.displayName ?? asset.url}
        sandbox="allow-scripts allow-same-origin"
        style={{
          border: "none",
          width: iframeW,
          height: iframeH,
          position: "absolute",
          top: hasViewport ? originY : 0,
          left: hasViewport ? originX : 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...(hasViewport
            ? {}
            : {
                // auto mode: fill container exactly like before
                width: `${(1 / zoom) * 100}%`,
                height: `${(1 / zoom) * 100}%`,
                top: 0,
                left: 0,
              }),
        }}
      />
      {/* Viewport frame outline when a preset is active */}
      {hasViewport && containerSize.w > 0 && (
        <div
          style={{
            position: "absolute",
            top: originY - 1,
            left: originX - 1,
            width: viewportW! * scale + 2,
            height: viewportH! * scale + 2,
            border: "1px solid rgba(91,141,239,0.35)",
            pointerEvents: "none",
            borderRadius: 1,
          }}
        />
      )}
    </div>
  );
}
