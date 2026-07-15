"use client";

import { Ref, useRef, useState, useEffect } from "react";
import { FileAsset } from "./ComparisonTool";

interface Props {
  asset: FileAsset;
  zoom: number;
  viewportW?: number | null;
  viewportH?: number | null;
  imgRef?: Ref<HTMLImageElement>;
}

function HtmlPreview({
  asset,
  zoom,
  viewportW,
  viewportH,
}: {
  asset: FileAsset;
  zoom: number;
  viewportW?: number | null;
  viewportH?: number | null;
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

export default function FilePreview({ asset, zoom, viewportW, viewportH, imgRef }: Props) {
  if (asset.type === "url") {
    return (
      <HtmlPreview
        asset={asset}
        zoom={zoom}
        viewportW={viewportW}
        viewportH={viewportH}
      />
    );
  }

  if (asset.type === "image") {
    return (
      <div className="flex items-center justify-center w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={asset.url}
          alt={asset.file?.name ?? ""}
          style={{
            maxWidth: `${zoom * 100}%`,
            maxHeight: `${zoom * 100}%`,
            width: "auto",
            height: "auto",
            display: "block",
            transition: "max-width 0.15s ease, max-height 0.15s ease",
          }}
          draggable={false}
        />
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <video
          src={asset.url}
          controls
          style={{
            maxWidth: `${zoom * 100}%`,
            maxHeight: `${zoom * 100}%`,
            width: "auto",
            height: "auto",
            display: "block",
            transition: "max-width 0.15s ease, max-height 0.15s ease",
          }}
        />
      </div>
    );
  }

  if (asset.type === "pdf") {
    return (
      <iframe
        src={asset.url}
        className="w-full h-full border-0"
        title={asset.file?.name ?? ""}
      />
    );
  }

  if (asset.type === "html") {
    return (
      <HtmlPreview
        asset={asset}
        zoom={zoom}
        viewportW={viewportW}
        viewportH={viewportH}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full" style={{ color: "var(--text-muted)" }}>
      <span className="text-4xl">📄</span>
      <span className="text-sm">{asset.file?.name ?? asset.displayName ?? ""}</span>
      <span className="text-xs">Preview not available</span>
    </div>
  );
}
