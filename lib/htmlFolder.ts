export interface HtmlFolderEntry {
  file: File;
  relativePath: string; // e.g. "folder/css/style.css"
}

export interface HtmlFolderResult {
  url: string;        // Processed blob URL (rewired index.html)
  folderName: string;
  entryFile: string;  // "index.html"
  fileCount: number;
}

// ─── Path utilities ───────────────────────────────────────────────────────────

function resolvePath(base: string, href: string): string {
  // Combine base directory + relative href, then normalise ../ and ./
  const parts = (base + href).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

function dirOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx + 1);
}

function isExternal(url: string): boolean {
  return (
    !url ||
    url.startsWith("data:") ||
    url.startsWith("http:") ||
    url.startsWith("https:") ||
    url.startsWith("//") ||
    url.startsWith("blob:") ||
    url.startsWith("#") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  );
}

// ─── Core builder ─────────────────────────────────────────────────────────────

export async function buildHtmlFolder(
  entries: HtmlFolderEntry[]
): Promise<HtmlFolderResult | null> {
  if (!entries.length) return null;

  // Identify root prefix (folder name before first /)
  const firstPath = entries[0].relativePath;
  const rootPrefix = firstPath.includes("/") ? firstPath.split("/")[0] + "/" : "";

  // Strip root prefix to get paths relative to folder root
  const normalized = entries.map(({ file, relativePath }) => ({
    file,
    path: relativePath.startsWith(rootPrefix)
      ? relativePath.slice(rootPrefix.length)
      : relativePath,
  }));

  // Find entry HTML file
  const htmlEntry =
    normalized.find(({ path }) => path === "index.html") ??
    normalized.find(({ path }) => path.endsWith("/index.html")) ??
    normalized.find(({ path }) => path.endsWith(".html"));

  if (!htmlEntry) return null;

  const htmlDir = dirOf(htmlEntry.path); // e.g. "" or "pages/"

  // Build lookup: path-relative-to-html-dir → File
  const fileByPath = new Map<string, File>();
  for (const { file, path } of normalized) {
    const rel = path.startsWith(htmlDir) ? path.slice(htmlDir.length) : path;
    fileByPath.set(rel, file);
  }

  // Resolve a href/src to a blob URL, relative to a base directory
  // Returns null if external or not found
  function resolveHref(href: string, base = ""): string | null {
    if (isExternal(href)) return null;
    const absPath = href.startsWith("/")
      ? href.slice(1) // treat as relative to html dir root
      : resolvePath(base, href);
    const file = fileByPath.get(absPath);
    return file ? URL.createObjectURL(file) : null;
  }

  // Process CSS text: rewrite url() and @import relative to cssBase
  function processCss(css: string, cssBase = ""): string {
    return css
      .replace(/@import\s+url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (_m, href) => {
        const resolved = resolveHref(href, cssBase);
        return resolved ? `@import url("${resolved}")` : _m;
      })
      .replace(/@import\s+['"]([^'"]+)['"]/g, (_m, href) => {
        const resolved = resolveHref(href, cssBase);
        return resolved ? `@import url("${resolved}")` : _m;
      })
      .replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (_m, href) => {
        if (isExternal(href)) return _m;
        const resolved = resolveHref(href, cssBase);
        return resolved ? `url("${resolved}")` : _m;
      });
  }

  // Read and process a CSS file, return a new blob URL for the rewritten CSS
  async function processCssFile(relPath: string): Promise<string | null> {
    const file = fileByPath.get(relPath);
    if (!file) return null;
    const text = await file.text();
    const cssBase = dirOf(relPath);
    const processed = processCss(text, cssBase);
    return URL.createObjectURL(new Blob([processed], { type: "text/css" }));
  }

  // ── Parse HTML ──────────────────────────────────────────────────────────────
  const htmlText = await htmlEntry.file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  const replaceAttr = (el: Element, attr: string, base = "") => {
    const val = el.getAttribute(attr);
    if (!val) return;
    const resolved = resolveHref(val, base);
    if (resolved) el.setAttribute(attr, resolved);
  };

  // Linked stylesheets — read + rewrite url() inside them
  const cssLinks = Array.from(
    doc.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet'][href]")
  );
  await Promise.all(
    cssLinks.map(async (el) => {
      const href = el.getAttribute("href")!;
      if (isExternal(href)) return;
      const relPath = href.startsWith("/") ? href.slice(1) : resolvePath("", href);
      const newUrl = await processCssFile(relPath);
      if (newUrl) el.setAttribute("href", newUrl);
    })
  );

  // Preload / other links
  doc.querySelectorAll("link:not([rel='stylesheet'])").forEach((el) =>
    replaceAttr(el, "href")
  );

  // Scripts
  doc.querySelectorAll("script[src]").forEach((el) => replaceAttr(el, "src"));

  // Images
  doc.querySelectorAll("img[src]").forEach((el) => replaceAttr(el, "src"));
  doc.querySelectorAll("img[srcset]").forEach((el) => {
    const srcset = el.getAttribute("srcset");
    if (!srcset) return;
    const rewritten = srcset
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        const space = trimmed.search(/\s/);
        if (space === -1) return resolveHref(trimmed) ?? trimmed;
        const url = trimmed.slice(0, space);
        const descriptor = trimmed.slice(space);
        return (resolveHref(url) ?? url) + descriptor;
      })
      .join(", ");
    el.setAttribute("srcset", rewritten);
  });

  // Media
  doc.querySelectorAll("video[src], audio[src]").forEach((el) => replaceAttr(el, "src"));
  doc.querySelectorAll("source[src]").forEach((el) => replaceAttr(el, "src"));

  // Inline styles
  doc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", processCss(style));
  });

  // <style> blocks
  doc.querySelectorAll("style").forEach((el) => {
    if (el.textContent) el.textContent = processCss(el.textContent);
  });

  // Serialize
  const output = "<!DOCTYPE html>" + doc.documentElement.outerHTML;
  const url = URL.createObjectURL(new Blob([output], { type: "text/html" }));

  const folderName = rootPrefix ? rootPrefix.slice(0, -1) : htmlEntry.file.name;

  return {
    url,
    folderName,
    entryFile: htmlEntry.path.split("/").pop() ?? "index.html",
    fileCount: entries.length,
  };
}

// ─── FileSystemEntry directory reader (for drag-drop) ────────────────────────

async function readEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((res, rej) => reader.readEntries(res, rej));
}

export async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry,
  basePath = ""
): Promise<HtmlFolderEntry[]> {
  const results: HtmlFolderEntry[] = [];
  const reader = entry.createReader();
  let batch: FileSystemEntry[];

  do {
    batch = await readEntries(reader);
    for (const e of batch) {
      const path = basePath ? `${basePath}/${e.name}` : e.name;
      if (e.isFile) {
        const file = await new Promise<File>((res, rej) =>
          (e as FileSystemFileEntry).file(res, rej)
        );
        results.push({ file, relativePath: path });
      } else if (e.isDirectory) {
        const sub = await readDirectoryEntry(e as FileSystemDirectoryEntry, path);
        results.push(...sub);
      }
    }
  } while (batch.length > 0);

  return results;
}
