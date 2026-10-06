import React, { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { W, H, PAD, CH, smoothPath, decimateCoords } from "./core/chart-math";
import { useLineChart } from "./core/use-line-chart";
import { ChartCanvas } from "./core/canvas";

export interface MetricDataPoint {
  timestamp: string | number | Date;
  value: number;
  label?: string;
}

export interface MetricLineChartProps {
  id?: string;
  data: MetricDataPoint[];
  label?: string;
  unit?: string;
  formatValue?: (val: number) => string;
  strokeColor?: string;
  fillColor?: string;
  min?: number;
  max?: number;
  height?: number;
  className?: string;
  emptyText?: string;
}

function formatAxisTimestamp(ts: string | number | Date, spanMs: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";

  // Multi-day span (> 3 days, e.g. 7d or 14d): "Oct 6"
  if (spanMs > 3 * 24 * 3600 * 1000) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Multi-day span (1-3 days): "10/06 21:30"
  if (spanMs > 24 * 3600 * 1000) {
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${mo}/${day} ${hh}:${mm}`;
  }

  // Short span (< 3 minutes): show seconds "21:30:10"
  if (spanMs < 3 * 60 * 1000) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  // Standard intra-day: compact 24-hour "21:30"
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTooltipDateTime(ts: string | number | Date): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

export const MetricLineChart: React.FC<MetricLineChartProps> = React.memo(({
  id = "metric-chart",
  data,
  label = "Metric",
  unit = "%",
  formatValue,
  strokeColor = "#3b82f6",
  fillColor = "#3b82f6",
  min,
  max,
  className,
  emptyText = "No historical metrics available yet",
}) => {
  const { containerRef, containerW, activeIdx, tipPos, scheduleHide, track } =
    useLineChart();

  const N = data.length;
  const values = useMemo(() => data.map((d) => d.value ?? 0), [data]);

  const leftPad =
    containerW > 0
      ? Math.max(PAD.left, Math.ceil((42 * W) / containerW))
      : PAD.left;
  const chartW = W - leftPad - PAD.right;

  // Determine min/max range
  const [chartMin, chartMax, tickStep] = useMemo(() => {
    if (values.length === 0) return [0, 100, 20];

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    // Baseline minimum: default to min prop if provided, else 0 if data >= 0, else floor of dataMin
    const mn = min !== undefined ? min : dataMin >= 0 ? 0 : Math.floor(dataMin);

    // If max is explicitly provided (e.g. 100% for CPU/RAM/Storage):
    // Use it directly to maintain consistent visual scale across all time ranges.
    if (max !== undefined) {
      const mx = Math.max(max, dataMax > max ? Math.ceil(dataMax / 10) * 10 : max);
      const step = Math.max(1, Math.round((mx - mn) / 4 / 5) * 5 || 20);
      return [mn, mx, step];
    }

    // Dynamic ceiling for unbounded metrics (e.g. active containers)
    let effectiveMax: number;
    if (dataMax <= mn) {
      effectiveMax = mn + 10;
    } else {
      const headroom = (dataMax - mn) * 0.12;
      effectiveMax = dataMax + Math.max(headroom, dataMax - mn > 10 ? 2 : 0.5);
    }

    // Calculate clean "nice" step and niceMax using standard 1, 2, 5 intervals
    const targetTicks = 4;
    const rawStep = Math.max(0.1, (effectiveMax - mn) / targetTicks);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let niceStepNorm: number;
    if (normalized <= 1.2) {
      niceStepNorm = 1;
    } else if (normalized <= 2.5) {
      niceStepNorm = 2;
    } else if (normalized <= 6) {
      niceStepNorm = 5;
    } else {
      niceStepNorm = 10;
    }

    let step = niceStepNorm * magnitude;
    let mx = Math.ceil(effectiveMax / step) * step;

    // If percentage metric and dataMax <= 100, ensure ceiling doesn't exceed 100
    if ((unit === "%" || max === 100) && dataMax <= 100 && mx > 100) {
      mx = 100;
      step = 20;
    }

    // Ensure at least 2 ticks
    if (mx <= mn) {
      mx = mn + step;
    }

    return [mn, mx, step];
  }, [values, min, max, unit]);

  const timestamps = useMemo(
    () => data.map((d) => new Date(d.timestamp).getTime()),
    [data]
  );

  const [minTs, maxTs] = useMemo(() => {
    if (timestamps.length === 0) return [0, 0];
    return [timestamps[0], timestamps[timestamps.length - 1]];
  }, [timestamps]);

  const timeSpan = maxTs - minTs;

  const xOf = useCallback(
    (i: number) => {
      if (N <= 1) return leftPad + chartW / 2;
      const t = timestamps[i];
      if (timeSpan > 0 && !isNaN(t)) {
        const ratio = Math.max(0, Math.min(1, (t - minTs) / timeSpan));
        return leftPad + ratio * chartW;
      }
      return leftPad + (i / (N - 1)) * chartW;
    },
    [N, leftPad, chartW, timestamps, minTs, timeSpan]
  );

  const yOf = useCallback(
    (v: number) => PAD.top + (1 - (v - chartMin) / (chartMax - chartMin)) * CH,
    [chartMin, chartMax]
  );

  const coords = useMemo<[number, number][]>(
    () => values.map((v, i) => [xOf(i), yOf(v)]),
    [values, xOf, yOf]
  );

  const chartCssW = containerW > 0 ? (chartW / W) * containerW : chartW;
  const renderCoords = useMemo(
    () => decimateCoords(coords, chartCssW),
    [coords, chartCssW]
  );

  const linePath = useMemo(() => smoothPath(renderCoords), [renderCoords]);
  const areaPath = useMemo(() => {
    if (renderCoords.length < 2) return "";
    const bot = PAD.top + CH;
    const last = renderCoords[renderCoords.length - 1];
    const first = renderCoords[0];
    return `${linePath} L ${last[0].toFixed(1)},${bot} L ${first[0].toFixed(1)},${bot} Z`;
  }, [linePath, renderCoords]);

  // Y-axis tick marks
  const yTicks = useMemo(() => {
    const ticks: { label: string; y: number }[] = [];
    const eps = tickStep * 0.001;
    for (let v = chartMin; v <= chartMax + eps; v += tickStep) {
      const rounded = Math.round(v * 100) / 100;
      const formatted = formatValue
        ? formatValue(rounded)
        : rounded % 1 === 0
        ? `${Math.round(rounded)}${unit}`
        : `${rounded.toFixed(1)}${unit}`;
      ticks.push({ label: formatted, y: yOf(rounded) });
    }
    return ticks;
  }, [chartMin, chartMax, tickStep, yOf, formatValue, unit]);

  // X-axis time marks
  const xLabels = useMemo(() => {
    if (data.length < 2) return [];

    const firstTs = new Date(data[0].timestamp).getTime();
    const lastTs = new Date(data[data.length - 1].timestamp).getTime();
    const spanMs = Math.max(0, lastTs - firstTs);

    // Calculate actual pixel width of chart plotting area
    const chartDisplayW = containerW > 0 ? (chartW / W) * containerW : 600;

    // Minimum distance between labels to guarantee zero overlap (in CSS px)
    const MIN_LABEL_GAP_PX = 95;

    // Determine safe maximum number of labels that can fit
    const maxLabels = Math.max(2, Math.min(6, Math.floor(chartDisplayW / MIN_LABEL_GAP_PX)));
    const targetCount = Math.min(data.length, maxLabels);

    if (targetCount <= 2) {
      const firstPt = data[0];
      const lastPt = data[data.length - 1];
      return [
        {
          x: xOf(0),
          label: formatAxisTimestamp(firstPt.timestamp, spanMs),
        },
        {
          x: xOf(data.length - 1),
          label: formatAxisTimestamp(lastPt.timestamp, spanMs),
        },
      ];
    }

    // Pick targetCount evenly distributed candidate indices across data
    const candidateIndices: number[] = [];
    for (let k = 0; k < targetCount; k++) {
      const idx = Math.round((k / (targetCount - 1)) * (data.length - 1));
      if (!candidateIndices.includes(idx)) {
        candidateIndices.push(idx);
      }
    }

    // Map candidate indices to screen positions and formatted text
    const candidateLabels = candidateIndices.map((idx) => {
      const pt = data[idx];
      const x = xOf(idx);
      const screenX = (x / W) * (containerW || W);
      return {
        x,
        screenX,
        label: formatAxisTimestamp(pt.timestamp, spanMs),
      };
    });

    // Collision filter: omit intermediate labels if too close or duplicate text
    const finalLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < candidateLabels.length; i++) {
      const curr = candidateLabels[i];
      const isFirst = i === 0;
      const isLast = i === candidateLabels.length - 1;

      if (isFirst) {
        finalLabels.push({ x: curr.x, label: curr.label });
        continue;
      }

      const prevScreenX =
        finalLabels.length > 0 ? (finalLabels[finalLabels.length - 1].x / W) * (containerW || W) : 0;
      const prevLabel =
        finalLabels.length > 0 ? finalLabels[finalLabels.length - 1].label : "";

      if (isLast) {
        // Guarantee the latest timestamp appears at the far right:
        // if it clashes with the immediately previous label, drop the previous one
        if (
          finalLabels.length > 1 &&
          (curr.screenX - prevScreenX < MIN_LABEL_GAP_PX || curr.label === prevLabel)
        ) {
          finalLabels.pop();
        }
        finalLabels.push({ x: curr.x, label: curr.label });
        continue;
      }

      // Intermediate label: check distance and text uniqueness against previous accepted label
      if (
        curr.screenX - prevScreenX >= MIN_LABEL_GAP_PX &&
        curr.label !== prevLabel
      ) {
        finalLabels.push({ x: curr.x, label: curr.label });
      }
    }

    return finalLabels;
  }, [data, xOf, containerW, chartW]);

  const resolvePoint = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (N < 2) return;
      const svgX = ((clientX - rect.left) / rect.width) * W;
      const targetX = Math.max(leftPad, Math.min(leftPad + chartW, svgX));

      // Find nearest data point to cursor by rendered X coordinate
      let best = 0;
      let minDiff = Infinity;
      for (let i = 0; i < N; i++) {
        const diff = Math.abs(xOf(i) - targetX);
        if (diff < minDiff) {
          minDiff = diff;
          best = i;
        } else if (diff > minDiff) {
          break;
        }
      }

      track(
        best,
        (xOf(best) / W) * rect.width,
        (coords[best][1] / H) * rect.height,
        rect.width
      );
    },
    [leftPad, chartW, N, xOf, coords, track]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) =>
      resolvePoint(e.clientX, e.currentTarget.getBoundingClientRect()),
    [resolvePoint]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      if (touch) {
        resolvePoint(touch.clientX, e.currentTarget.getBoundingClientRect());
      }
    },
    [resolvePoint]
  );

  const activePt = activeIdx !== null ? data[activeIdx] : null;
  const activeVal = activeIdx !== null ? values[activeIdx] : null;

  if (N < 2) {
    return (
      <div
        className={cn(
          "flex h-56 w-full items-center justify-center rounded-xl border border-border/60 bg-secondary/15 text-sm text-muted-foreground",
          className
        )}
      >
        <span>{emptyText}</span>
      </div>
    );
  }

  const defaultFormatter = (v: number) =>
    formatValue ? formatValue(v) : `${v.toFixed(1)}${unit}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-56 w-full select-none touch-none rounded-xl border border-border/60 bg-card/60 p-2 backdrop-blur-sm",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => scheduleHide(0)}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => scheduleHide(2000)}
      onTouchCancel={() => scheduleHide(2000)}
      role="img"
      aria-label={`${label} chart`}
    >
      <ChartCanvas
        id={id}
        linePath={linePath}
        areaPath={areaPath}
        yTicks={yTicks}
        activeX={activeIdx !== null ? coords[activeIdx][0] : undefined}
        padLeft={leftPad}
        chartW={chartW}
        strokeColor={strokeColor}
        fillColor={fillColor}
      />

      {/* Y-axis labels */}
      {yTicks.map(({ label: tickLabel, y }, i) => (
        <div
          key={i}
          className="pointer-events-none absolute select-none font-mono text-[10px] text-muted-foreground/70"
          style={{
            right: `${((W - leftPad + 6) / W) * 100}%`,
            top: `${(y / H) * 100}%`,
            transform: "translateY(-50%)",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {tickLabel}
        </div>
      ))}

      {/* X-axis time labels */}
      {xLabels.map(({ x, label: timeLabel }, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === xLabels.length - 1;
        const tx = isFirst ? "0%" : isLast ? "-100%" : "-50%";
        return (
          <div
            key={idx}
            className="pointer-events-none absolute select-none font-mono text-[9px] sm:text-[10px] tabular-nums text-muted-foreground/60"
            style={{
              left: `${(x / W) * 100}%`,
              bottom: 8,
              transform: `translateX(${tx})`,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {timeLabel}
          </div>
        );
      })}

      {/* Active highlight dot */}
      {activeIdx !== null && coords[activeIdx] && (
        <div
          className="pointer-events-none absolute rounded-full shadow-lg"
          style={{
            left: `${(coords[activeIdx][0] / W) * 100}%`,
            top: `${(coords[activeIdx][1] / H) * 100}%`,
            width: 10,
            height: 10,
            transform: "translate(-50%, -50%)",
            backgroundColor: strokeColor,
            boxShadow: `0 0 12px ${strokeColor}`,
            border: "2px solid #ffffff",
          }}
        />
      )}

      {/* Floating Tooltip */}
      {tipPos !== null && activeVal !== null && activePt && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: Math.min(Math.max(tipPos.x, 70), tipPos.containerW - 70),
            top: tipPos.y,
            transform: "translate(-50%, calc(-100% - 12px))",
            transition: "top 40ms ease-out",
          }}
        >
          <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-md text-left min-w-[110px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <span className="text-xs font-bold font-mono text-foreground">
                {defaultFormatter(activeVal)}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-mono tabular-nums text-muted-foreground/75">
              {formatTooltipDateTime(activePt.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

MetricLineChart.displayName = "MetricLineChart";

export default MetricLineChart;
