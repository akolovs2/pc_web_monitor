import React from "react";
import type { ProgressCardProps } from "../../types/Metrics";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ProgressBar } from "../../components";
import { Cpu, MemoryStick, Activity, HardDrive } from "lucide-react";

const getMetricMeta = (title: string, value: number) => {
  const lower = title.toLowerCase();
  let label = `${title} Load`;
  let icon = <Activity className="h-4 w-4 text-emerald-400" />;

  if (lower.includes("cpu")) {
    label = "CPU Load";
    icon = <Cpu className="h-4 w-4 text-sky-400" />;
  } else if (lower.includes("ram") || lower.includes("memory")) {
    label = "Memory Usage";
    icon = <MemoryStick className="h-4 w-4 text-indigo-400" />;
  } else if (lower.includes("storage") || lower.includes("disk")) {
    label = "Disk Storage";
    icon = <HardDrive className="h-4 w-4 text-amber-400" />;
  }

  const statusVariant: "success" | "warning" | "destructive" =
    value >= 85 ? "destructive" : value >= 70 ? "warning" : "success";
  const statusText = value >= 85 ? "Critical" : value >= 70 ? "Elevated" : "Nominal";

  return { label, icon, statusVariant, statusText };
};

const ProgressCard = React.memo(({ title, value, subtitle, extraInfo }: ProgressCardProps) => {
  const formattedValue = (value || 0).toFixed(1);
  const displayLabel = extraInfo || subtitle || "Live telemetry";
  const { label, icon, statusVariant, statusText } = getMetricMeta(title, value || 0);

  return (
    <Card className="w-full bg-card border-border hover:border-border-hover transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-secondary/80 border border-border text-muted-foreground">
            {icon}
          </div>
          <CardTitle className="text-xs font-semibold text-slate-300">
            {label}
          </CardTitle>
        </div>
        <span
          className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
            statusVariant === "destructive"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
              : statusVariant === "warning"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <span
            className={`h-1 w-1 rounded-full ${
              statusVariant === "destructive"
                ? "bg-rose-400"
                : statusVariant === "warning"
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
          />
          {statusText}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums text-foreground">
            {formattedValue}%
          </span>
          <span
            className="text-xs font-mono text-muted-foreground truncate"
            title={displayLabel}
          >
            {displayLabel}
          </span>
        </div>
        <ProgressBar value={value} size="md" />
      </CardContent>
    </Card>
  );
});

ProgressCard.displayName = "ProgressCard";

export default ProgressCard;