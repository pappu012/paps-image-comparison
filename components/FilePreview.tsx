"use client";

import { Ref } from "react";
import { FileAsset } from "./ComparisonTool";
import HtmlPreview from "./HtmlPreview";

interface Props {
  asset: FileAsset;
  zoom: number;
  viewportW?: number | null;
  viewportH?: number | null;
  imgRef?: Ref<HTMLImageElement>;
  iframeRef?: Ref<HTMLIFrameElement>;
  pdfPageUrl?: string | null;
  pdfRendering?: boolean;
}

export default function FilePreview({
  asset,
  zoom,
  viewportW,
  viewportH,
  imgRef,
  iframeRef,
  pdfPageUrl,
  pdfRendering,
}: Props) {
  if (asset.type === "url") {
    return (
      <HtmlPreview
        asset={asset}
        zoom={zoom}
        viewportW={viewportW}
        viewportH={viewportH}
        iframeRef={iframeRef}
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
    if (!pdfPageUrl) {
      return (
        <div
          className="flex items-center justify-center w-full h-full text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {pdfRendering ? "Rendering PDF…" : "Preparing PDF…"}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={pdfPageUrl}
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
