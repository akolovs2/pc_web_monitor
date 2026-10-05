import { useState, useEffect } from "react";
import type { ContainerItemProps } from "../../types/Metrics";
import { Button, Badge, Spinner } from "../../components";
import { Play, Square, RotateCw, Box, Cpu, Database } from "lucide-react";

const ContainerItem = ({ name, status, cpu, memory, onAction }: ContainerItemProps) => {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);

  if (status !== prevStatus) {
    setPrevStatus(status);
    setLoading(false);
    setPendingAction(null);
  }

  useEffect(() => {
    if (pendingAction === "restart" && loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setPendingAction(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [pendingAction, loading]);

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setLoading(true);
    setPendingAction(action);
    try {
      const result = await onAction(name, action);
      if (!result || !result.success) {
        setLoading(false);
        setPendingAction(null);
      }
    } catch {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const isRunning = status === "running";

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all duration-200">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="p-2 rounded-md bg-secondary/60 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5 sm:mt-0">
          <Box className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate" title={name}>
              {name}
            </span>
            <Badge
              variant={isRunning ? "success" : "destructive"}
              className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 flex items-center gap-1"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isRunning ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              {status}
            </Badge>
          </div>

          {isRunning && (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-sky-400" />
                <span>{cpu}%</span>
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3 text-indigo-400" />
                <span>{memory}%</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <Spinner size="sm" />
            <span className="capitalize">{pendingAction || "Updating"}...</span>
          </div>
        ) : isRunning ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("stop")}
              className="h-8 px-2.5 text-xs hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Square className="h-3 w-3 mr-1 fill-current" />
              Stop
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction("restart")}
              className="h-8 px-2.5 text-xs hover:bg-accent transition-colors"
            >
              <RotateCw className="h-3 w-3 mr-1" />
              Restart
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAction("start")}
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Play className="h-3 w-3 mr-1 fill-current" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContainerItem;