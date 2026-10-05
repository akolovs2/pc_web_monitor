import { useState, useEffect, useCallback, useMemo } from "react";
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

export const MetricsHistoryCard: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("cpu");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("24h");
  const [historyData, setHistoryData] = useState<MetricHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async (range: TimeRange) => {
    setLoading(true);
    try {
      const records = await fetchMetricsHistory(range);
      setHistoryData(records || []);
    } catch {
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(selectedRange);
    // Auto-refresh historical trends every 60 seconds
    const interval = setInterval(() => {
      loadHistory(selectedRange);
    }, 60000);
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
    <Card className="w-full bg-card/90 border-border/70 shadow-lg">
      <CardHeader className="space-y-4 pb-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Historical Trends
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                  {chartData.length} pts
                </Badge>
              </CardTitle>
            </div>
          </div>

          {/* Time Range Selector & Refresh */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-0.5">
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all cursor-pointer ${
                    selectedRange === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => loadHistory(selectedRange)}
              disabled={loading}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Refresh History"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
            const cfg = METRIC_CONFIG[key];
            const Icon = cfg.icon;
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-secondary text-foreground border-border shadow-sm ring-1 ring-border"
                    : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: cfg.strokeColor }} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Summary Stats Row */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-left">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Latest</span>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {stats.latest.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-left">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Average</span>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {stats.avg.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-left">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Peak (Max)</span>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {stats.max.toFixed(1)}{currentConfig.unit}
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-left">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Minimum</span>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
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
};

export default MetricsHistoryCard;
