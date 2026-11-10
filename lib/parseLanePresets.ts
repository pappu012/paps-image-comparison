export interface LanePreset {
  label: string;
  width: number;
  height: number;
}

/**
 * Accepts a pasted JS/JSON-ish array of { label, width, height } objects
 * (unquoted keys, backticks, trailing commas, bare `Enum.Member` values like
 * `Format.JPG` are all fine) and returns normalized lane presets.
 *
 * This evaluates the pasted text as a JS expression (via `Function`), so it
 * should only ever be used with config you pasted yourself — never with
 * untrusted/external text.
 */
export function parseLanePresetConfig(input: string): LanePreset[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const wrapped = trimmed.startsWith("[") ? trimmed : `[${trimmed}]`;

  // Any bare `Something.Member` reference (e.g. Format.JPG) resolves to the
  // member name as a string, so configs copied from elsewhere don't need
  // their enum imports.
  const enumProxy = new Proxy(
    {},
    { get: (_target, prop) => String(prop) }
  );

  let raw: unknown;
  try {
    const factory = new Function(
      "Format",
      "Size",
      "Preset",
      `"use strict"; return (${wrapped});`
    );
    raw = factory(enumProxy, enumProxy, enumProxy);
  } catch (err) {
    throw new Error(
      `Couldn't parse that list: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!Array.isArray(raw)) {
    throw new Error("Expected a list of { label, width, height } entries.");
  }

  return raw.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    const label = String(e?.label ?? e?.name ?? `Lane ${i + 1}`);
    const width = Number(e?.width ?? e?.w);
    const height = Number(e?.height ?? e?.h);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error(`Entry ${i + 1} ("${label}") is missing a valid width/height.`);
    }
    return { label, width: Math.round(width), height: Math.round(height) };
  });
}
