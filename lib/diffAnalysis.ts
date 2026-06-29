export interface DiffAnalysis {
  dominantTypes: string[];   // e.g. ["font / text", "layout shift"]
  regions: string[];         // e.g. ["upper area", "right side"]
  aaRatio: number;           // 0-1, fraction of blue (AA) vs red (actual diff) pixels
  redPixels: number;
  bluePixels: number;
  summary: string;           // one-sentence plain English
}

/**
 * Analyses a pixelmatch output buffer (diffColor=[255,50,50], diffColorAlt=[50,50,255])
 * to infer the nature of differences without a full connected-components pass.
 */
export function analyzeDiff(
  diffArr: Uint8ClampedArray,
  w: number,
  h: number,
): DiffAnalysis {
  const GRID = 8;
  const cellW = Math.ceil(w / GRID);
  const cellH = Math.ceil(h / GRID);
  const redGrid   = new Array(GRID * GRID).fill(0);
  let totalRed = 0, totalBlue = 0;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const r = diffArr[i], g = diffArr[i + 1], b = diffArr[i + 2];
      const row = Math.min(Math.floor(py / cellH), GRID - 1);
      const col = Math.min(Math.floor(px / cellW), GRID - 1);
      if (r > 150 && g < 100 && b < 100) {
        redGrid[row * GRID + col]++;
        totalRed++;
      } else if (b > 150 && r < 100) {
        totalBlue++;
      }
    }
  }

  const total = totalRed + totalBlue;
  const aaRatio = total > 0 ? totalBlue / total : 0;

  // Scatter: how many cells hold red pixels, and how dense is each?
  const cellArea     = cellW * cellH;
  const redCells     = redGrid.filter(c => c > 0).length;
  const avgPerCell   = totalRed / Math.max(redCells, 1);
  const isScattered  = redCells > GRID * GRID * 0.25 && avgPerCell < cellArea * 0.08;
  const isConcentrated = redCells <= GRID * GRID * 0.12 && totalRed > 0;

  // Row & column totals for spatial analysis
  const rowTotals = Array.from({ length: GRID }, (_, r) =>
    redGrid.slice(r * GRID, (r + 1) * GRID).reduce((a, b) => a + b, 0),
  );
  const colTotals = Array.from({ length: GRID }, (_, c) =>
    Array.from({ length: GRID }, (_, r) => redGrid[r * GRID + c]).reduce((a, b) => a + b, 0),
  );

  // Horizontal band detection: one or two rows dominate
  const maxRow   = Math.max(...rowTotals);
  const avgRow   = totalRed / GRID;
  const hasHorizontalBand = maxRow > avgRow * 4 && totalRed > 0;

  // Vertical band detection
  const maxCol   = Math.max(...colTotals);
  const avgCol   = totalRed / GRID;
  const hasVerticalBand = maxCol > avgCol * 4 && totalRed > 0;

  // Spatial region
  const topHalf    = rowTotals.slice(0, GRID / 2).reduce((a, b) => a + b, 0);
  const bottomHalf = rowTotals.slice(GRID / 2).reduce((a, b) => a + b, 0);
  const leftHalf   = colTotals.slice(0, GRID / 2).reduce((a, b) => a + b, 0);
  const rightHalf  = colTotals.slice(GRID / 2).reduce((a, b) => a + b, 0);

  const regions: string[] = [];
  if (totalRed > 0) {
    const vRatio = topHalf / Math.max(bottomHalf, 1);
    const hRatio = leftHalf / Math.max(rightHalf, 1);
    if (vRatio > 2.5)       regions.push("upper area");
    else if (vRatio < 0.4)  regions.push("lower area");
    if (hRatio > 2.5)       regions.push("left side");
    else if (hRatio < 0.4)  regions.push("right side");
    if (regions.length === 0) regions.push("spread across image");
  }

  // Determine change types
  const dominantTypes: string[] = [];

  if (aaRatio > 0.6 || (isScattered && aaRatio > 0.3)) {
    dominantTypes.push("font / text rendering");
  } else if (isScattered) {
    dominantTypes.push("font / text rendering");
  }

  if (hasHorizontalBand && !isScattered) {
    dominantTypes.push("layout / spacing shift");
  }

  if (hasVerticalBand && !isScattered && !hasHorizontalBand) {
    dominantTypes.push("element repositioning");
  }

  if (isConcentrated && !hasHorizontalBand && !hasVerticalBand) {
    dominantTypes.push("image / object change");
  }

  if (dominantTypes.length === 0 && totalRed > 0) {
    if (redCells > GRID * GRID * 0.5) {
      dominantTypes.push("colour / tone shift");
    } else {
      dominantTypes.push("mixed changes");
    }
  }

  // Build summary sentence
  let summary = "";
  if (totalRed === 0 && totalBlue === 0) {
    summary = "No changed pixels found.";
  } else if (totalRed === 0) {
    summary = "Differences are limited to anti-aliasing edges — no substantive content change.";
  } else {
    const typeStr = dominantTypes.join(" and ");
    const regionStr = regions.join(", ");
    summary = `Changes appear to be ${typeStr}, concentrated in the ${regionStr}.`;
    if (aaRatio > 0.4) summary += " A large proportion of differences are anti-aliasing.";
  }

  return { dominantTypes, regions, aaRatio, redPixels: totalRed, bluePixels: totalBlue, summary };
}
