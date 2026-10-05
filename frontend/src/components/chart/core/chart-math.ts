export const W = 800;
export const H = 240;
export const PAD = { top: 20, right: 24, bottom: 36, left: 54 } as const;
export const CH = H - PAD.top - PAD.bottom; // 184

/**
 * Generates a smooth cubic Bezier SVG path through the given coordinates.
 */
export function smoothPath(pts: readonly [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  }

  const T = 0.35;
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1[0] + ((p2[0] - p0[0]) * T) / 3;
    const cp1y = p1[1] + ((p2[1] - p0[1]) * T) / 3;
    const cp2x = p2[0] - ((p3[0] - p1[0]) * T) / 3;
    const cp2y = p2[1] - ((p3[1] - p1[1]) * T) / 3;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

/**
 * Reduces dense coordinate arrays to prevent sluggish SVG rendering
 * while preserving peaks and valleys.
 */
export function decimateCoords(
  coords: [number, number][],
  chartCssW: number,
): [number, number][] {
  if (coords.length <= 200) return coords;
  const maxPts = Math.max(150, Math.round(chartCssW / 2));
  const step = Math.ceil(coords.length / maxPts);
  if (step <= 1) return coords;

  const out: [number, number][] = [coords[0]];
  for (let i = step; i < coords.length - 1; i += step) {
    out.push(coords[i]);
  }
  out.push(coords[coords.length - 1]);
  return out;
}
