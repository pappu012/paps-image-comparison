import type { PDFDocumentProxy } from "pdfjs-dist";

let workerConfigured = false;

// pdfjs-dist touches browser-only globals (DOMMatrix, etc.) as soon as its
// module body runs, which breaks Next's static prerendering if it's
// imported at the top level. Loading it lazily keeps it out of the
// server/prerender bundle entirely — it only ever executes in the browser.
async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await loadPdfjs();
  const data = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data }).promise;
}

// Renders one page to a PNG data URL so it can be displayed like any other
// image — no embedded PDF viewer/controls.
export async function renderPdfPageToDataUrl(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale = 2
): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  if (!canvas.getContext("2d")) throw new Error("Canvas 2D context unavailable");
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/png");
}
