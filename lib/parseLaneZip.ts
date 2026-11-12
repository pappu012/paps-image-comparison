import JSZip from "jszip";

export interface ZipLaneCandidate {
  path: string;
  label: string;
  ext: string;
  mime: string;
  width: number | null;
  height: number | null;
  blob: Blob;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

// Matches a `300x250` / `300×250` style size token anywhere in the filename.
const SIZE_PATTERN = /(\d{2,5})\s?[x×]\s?(\d{2,5})/i;

function isJunkPath(path: string): boolean {
  const base = path.split("/").pop() ?? "";
  return (
    path.startsWith("__MACOSX/") ||
    base.startsWith(".") ||
    base === ""
  );
}

function labelFromName(nameNoExt: string): string {
  const withoutSize = nameNoExt.replace(SIZE_PATTERN, " ").trim();
  const cleaned = (withoutSize || nameNoExt).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || nameNoExt;
}

/**
 * Reads a dropped/selected .zip and returns one candidate lane per
 * recognised asset file inside it (images, video, pdf). Folders,
 * hidden/system files, and unrecognised extensions are skipped.
 */
export async function parseLaneZip(file: File): Promise<ZipLaneCandidate[]> {
  const zip = await JSZip.loadAsync(file);
  const candidates: ZipLaneCandidate[] = [];

  const entries = Object.values(zip.files).filter((e) => !e.dir && !isJunkPath(e.name));
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  for (const entry of entries) {
    const fileName = entry.name.split("/").pop() ?? entry.name;
    const dot = fileName.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = fileName.slice(dot + 1).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue;

    const nameNoExt = fileName.slice(0, dot);
    const sizeMatch = nameNoExt.match(SIZE_PATTERN);

    const blob = await entry.async("blob");
    candidates.push({
      path: entry.name,
      label: labelFromName(nameNoExt),
      ext: ext.toUpperCase(),
      mime,
      width: sizeMatch ? Number(sizeMatch[1]) : null,
      height: sizeMatch ? Number(sizeMatch[2]) : null,
      blob,
    });
  }

  if (candidates.length === 0) {
    throw new Error("No recognisable image, video, or PDF files found in that zip.");
  }

  return candidates;
}
