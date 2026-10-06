export const W = 800;
export const H = 240;
export const PAD = { top: 20, right: 24, bottom: 36, left: 54 } as const;
export const CH = H - PAD.top - PAD.bottom; // 184

/**
 * Generates a smooth, monotone cubic Bezier SVG path through the given coordinates.
 * Uses Fritsch-Carlson monotone cubic spline interpolation to prevent overshoot,
 * ensuring flat segments (same values) stay strictly horizontal with zero bumping/horns.
 */
export function smoothPath(pts: readonly [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  if (n === 2) {
    return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  }

  // 1. Calculate secant slopes (delta) and segment widths (h)
  const deltas = new Float64Array(n - 1);
  const h = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    h[i] = dx;
    deltas[i] = dx !== 0 ? dy / dx : 0;
  }

  // 2. Initialize tangent slopes (m)
  const m = new Float64Array(n);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const dPrev = deltas[i - 1];
    const dNext = deltas[i];

    // If opposite signs (local extremum) or either is zero (flat plateau), tangent is 0
    if (dPrev * dNext <= 0) {
      m[i] = 0;
    } else {
      // Shape-preserving harmonic mean (PCHIP / Fritsch-Butland)
      const hSum = h[i - 1] + h[i];
      m[i] =
        hSum > 0
          ? (3 * hSum) /
            ((2 * h[i] + h[i - 1]) / dPrev + (h[i] + 2 * h[i - 1]) / dNext)
          : 0;
    }
  }

  // 3. Fritsch-Carlson monotonicity check & clamping
  for (let i = 0; i < n - 1; i++) {
    const d = deltas[i];
    if (d === 0) {
      // Strictly horizontal segment: zero slope at both ends
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / d;
      const beta = m[i + 1] / d;
      if (alpha < 0) m[i] = 0;
      if (beta < 0) m[i + 1] = 0;

      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[i] = tau * alpha * d;
        m[i + 1] = tau * beta * d;
      }
    }
  }

  // 4. Construct SVG cubic Bezier path
  let path = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dx = h[i];

    const cp1x = p1[0] + dx / 3;
    const cp1y = p1[1] + (m[i] * dx) / 3;
    const cp2x = p2[0] - dx / 3;
    const cp2y = p2[1] - (m[i + 1] * dx) / 3;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return path;
}

/**
 * Reduces dense coordinate arrays to prevent sluggish SVG rendering
 * while preserving peaks and valleys (min and max Y).
 */
export function decimateCoords(
  coords: [number, number][],
  chartCssW: number,
): [number, number][] {
  // SVG handles up to 500 points with ease; only decimate if significantly dense
  if (coords.length <= 500) return coords;
  const maxPts = Math.max(250, Math.round(chartCssW));
  const step = Math.ceil(coords.length / maxPts);
  if (step <= 1) return coords;

  const out: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i += step) {
    const chunk = coords.slice(i, Math.min(i + step, coords.length - 1));
    if (chunk.length === 0) continue;

    // In SVG space, lowest Y is the peak (highest metric value),
    // and highest Y is the valley (lowest metric value).
    let peakPt = chunk[0];
    let valleyPt = chunk[0];
    for (let j = 1; j < chunk.length; j++) {
      if (chunk[j][1] < peakPt[1]) peakPt = chunk[j];
      if (chunk[j][1] > valleyPt[1]) valleyPt = chunk[j];
    }

    // Preserve temporal order (by X coordinate)
    if (peakPt[0] <= valleyPt[0]) {
      out.push(peakPt);
      if (valleyPt !== peakPt) out.push(valleyPt);
    } else {
      out.push(valleyPt);
      if (peakPt !== valleyPt) out.push(peakPt);
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}
