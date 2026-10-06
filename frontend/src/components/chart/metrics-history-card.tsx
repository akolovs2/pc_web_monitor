import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricLineChart, type MetricDataPoint } from "./metric-line-chart";
import { fetchMetricsHistory, type MetricHistoryRecord } from "@/services/api";
import {
  TrendingUp,
  RotateCw,
  Cpu,
  MemoryStick,
  HardDrive,
  Box,
} from "lucide-react";

type MetricKey = "cpu" | "ram" | "storage" | "running_containers";
type TimeRange = "1h" | "6h" | "24h" | "7d" | "14d";

const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    unit: string;
    strokeColor: string;
    fillColor: string;
    icon: typeof Cpu;
    min?: number;
    max?: number;
  }
> = {
  cpu: {
    label: "CPU Usage",
    unit: "%",
    strokeColor: "#38bdf8",
    fillColor: "#38bdf8",
    icon: Cpu,
    min: 0,
    max: 100,
  },
  ram: {
    label: "RAM Usage",
    unit: "%",
    strokeColor: "#818cf8",
    fillColor: "#818cf8",
    icon: MemoryStick,
    min: 0,
    max: 100,
  },
  storage: {
    label: "Storage Usage",
    unit: "%",
    strokeColor: "#f59e0b",
    fillColor: "#f59e0b",
    icon: HardDrive,
    min: 0,
    max: 100,
  },
  running_containers: {
    label: "Active Containers",
    unit: "",
    strokeColor: "#10b981",
    fillColor: "#10b981",
    icon: Box,
    min: 0,
  },
};

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "1h", label: "1h" },
  { key: "6h", label: "6h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
];

/**
 * Fast equality check to prevent re-rendering when new records haven't changed.
 */
function isHistoryEqual(
  a: MetricHistoryRecord[],
  b: MetricHistoryRecord[]
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  if (
    lastA.timestamp !== lastB.timestamp ||
    lastA.cpu !== lastB.cpu ||
    lastA.ram !== lastB.ram ||
    lastA.storage !== lastB.storage ||
    lastA.running_containers !== lastB.running_containers
  ) {
    return false;
  }
  return a[0].timestamp === b[0].timestamp;
}

export const MetricsHistoryCard: React.FC = React.memo(() => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("cpu");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("24h");
  const [historyData, setHistoryData] = useState<MetricHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async (range: TimeRange, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const records = await fetchMetricsHistory(range);
      setHistoryData((prev) =>
        isHistoryEqual(prev, records || []) ? prev : (records || [])
      );
    } catch {
      if (!silent) setHistoryData([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount or range switch (with loading state)
    loadHistory(selectedRange, false);

    // Auto-refresh historical trends silently every 10 seconds
    const interval = setInterval(() => {
      loadHistory(selectedRange, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedRange, loadHistory]);

  const currentConfig = METRIC_CONFIG[selectedMetric];

  // Map backend history rows into MetricDataPoint
  const chartData: MetricDataPoint[] = useMemo(() => {
    return historyData.map((row) => ({
      timestamp: row.timestamp,
      value: row[selectedMetric] ?? 0,
    }));
  }, [historyData, selectedMetric]);

  // Compute summary stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { latest: 0, avg: 0, min: 0, max: 0 };
    }
    const vals = chartData.map((d) => d.value);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      latest: vals[vals.length - 1],
      avg: sum / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [chartData]);

  return (
    <Card className="w-full bg-card border-border hover:border-border-hover transition-colors">
      <CardHeader className="space-y-3 pb-3">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-secondary/80 border border-border text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-sky-400" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-semibold text-slate-300">
                Historical Telemetry
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border">
                {chartData.length} pts
              </Badge>
            </div>
          </div>

          {/* Time Range Selector & Controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <div className="flex items-center rounded border border-border bg-secondary/40 p-0.5">
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-2 py-0.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                    selectedRange === key
                      ? "bg-primary/20 text-sky-300 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Auto-refresh interval indicator */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/60 bg-secondary/30 text-[10px] font-mono text-muted-foreground"
              title="Auto-refreshing every 10 seconds"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>10s</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => loadHistory(selectedRange, false)}
              disabled={loading}
              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Refresh History"
            >
              <RotateCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <div className="flex items-center rounded border border-border bg-secondary/30 p-0.5">
            {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
              const cfg = METRIC_CONFIG[key];
              const Icon = cfg.icon;
              const isSelected = selectedMetric === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-secondary text-foreground border border-border shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: cfg.strokeColor }} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Stats Row */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40">
            <div className="rounded border border-border/60 bg-secondary/25 p-2 text-left">
              <span className="text-[10px] font-mono text-muted-foreground">Latest Value</span>
              <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
                {stats.latest.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded border border-border/60 bg-secondary/25 p-2 text-left">
              <span className="text-[10px] font-mono text-muted-foreground">Average</span>
              <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
                {stats.avg.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded border border-border/60 bg-secondary/25 p-2 text-left">
              <span className="text-[10px] font-mono text-muted-foreground">Peak (Max)</span>
              <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
                {stats.max.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded border border-border/60 bg-secondary/25 p-2 text-left">
              <span className="text-[10px] font-mono text-muted-foreground">Minimum</span>
              <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
                {stats.min.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <MetricLineChart
          id={`chart-${selectedMetric}`}
          data={chartData}
          label={currentConfig.label}
          unit={currentConfig.unit}
          strokeColor={currentConfig.strokeColor}
          fillColor={currentConfig.fillColor}
          min={currentConfig.min}
          max={currentConfig.max}
          emptyText={
            loading
              ? "Loading historical data..."
              : `Collecting snapshots every 10 seconds. Check back in a moment or change time range.`
          }
        />
      </CardContent>
    </Card>
  );
});

MetricsHistoryCard.displayName = "MetricsHistoryCard";

export default MetricsHistoryCard;
