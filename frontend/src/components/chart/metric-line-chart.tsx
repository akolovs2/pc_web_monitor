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

function formatTimestamp(ts: string | number | Date): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string | number | Date): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
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
    const rawMin = min !== undefined ? min : Math.min(...values);
    const rawMax = max !== undefined ? max : Math.max(...values);
    let mn = Math.floor(rawMin);
    let mx = Math.ceil(rawMax);

    if (mx === mn) {
      mx += 10;
      mn = Math.max(0, mn - 5);
    }

    const range = mx - mn;
    let step = 20;
    if (range <= 10) step = 2;
    else if (range <= 25) step = 5;
    else if (range <= 50) step = 10;
    else if (range <= 100) step = 20;
    else step = Math.ceil(range / 5 / 10) * 10;

    mn = Math.floor(mn / step) * step;
    mx = Math.ceil(mx / step) * step;
    if (mx === mn) mx += step;

    return [mn, mx, step];
  }, [values, min, max]);

  const xOf = useCallback(
    (i: number) => leftPad + (N > 1 ? (i / (N - 1)) * chartW : chartW / 2),
    [N, leftPad, chartW]
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
    for (let v = chartMin; v <= chartMax; v += tickStep) {
      const formatted = formatValue ? formatValue(v) : `${Math.round(v)}${unit}`;
      ticks.push({ label: formatted, y: yOf(v) });
    }
    return ticks;
  }, [chartMin, chartMax, tickStep, yOf, formatValue, unit]);

  // X-axis time marks
  const xLabels = useMemo(() => {
    if (data.length < 2) return [];
    const minLabelPx = 60;
    const maxLabels = Math.max(2, Math.floor((containerW || 600) / minLabelPx));
    const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)));

    const indices: number[] = [0];
    for (let i = step; i < data.length - 1; i += step) {
      indices.push(i);
    }
    indices.push(data.length - 1);

    return indices.map((idx) => {
      const pt = data[idx];
      return {
        x: xOf(idx),
        label: formatTimestamp(pt.timestamp),
        date: formatDate(pt.timestamp),
      };
    });
  }, [data, xOf, containerW]);

  const resolvePoint = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (N < 2) return;
      const svgX = ((clientX - rect.left) / rect.width) * W;
      const raw = ((svgX - leftPad) / chartW) * (N - 1);
      const best = Math.max(0, Math.min(N - 1, Math.round(raw)));
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
            className="pointer-events-none absolute select-none font-mono text-[10px] text-muted-foreground/60"
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
            <p className="mt-1 text-[10px] font-mono text-muted-foreground/75">
              {formatDate(activePt.timestamp)} {formatTimestamp(activePt.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricLineChart;
