import type { ProgressCardProps } from "../../types/Metrics";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ProgressBar } from "../../components";
import { Cpu, MemoryStick, Activity } from "lucide-react";

const getCardIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("cpu")) return <Cpu className="h-4 w-4 text-sky-400" />;
  if (lower.includes("ram") || lower.includes("memory"))
    return <MemoryStick className="h-4 w-4 text-indigo-400" />;
  return <Activity className="h-4 w-4 text-emerald-400" />;
};

const ProgressCard = ({ title, value }: ProgressCardProps) => {
  const formattedValue = (value || 0).toFixed(1);

  return (
    <Card className="flex-1 min-w-[280px] max-w-md bg-card/90 border-border/70 shadow-lg hover:border-border transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title} Usage
        </CardTitle>
        <div className="p-2 rounded-lg bg-secondary/80 border border-border/50">
          {getCardIcon(title)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
            {formattedValue}%
          </span>
          <span className="text-xs font-medium text-muted-foreground">Real-time load</span>
        </div>
        <ProgressBar value={value} size="md" />
      </CardContent>
    </Card>
  );
};

export default ProgressCard;