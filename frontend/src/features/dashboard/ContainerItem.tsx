import React, { useState, useEffect } from "react";
import type { ContainerItemProps, ContainerActionType } from "../../types/Metrics";
import { Button, Badge, Spinner, ConfirmDialog } from "../../components";
import { Play, Square, RotateCw, Trash2, Box, Cpu, Database, Sliders } from "lucide-react";

const ContainerItem = React.memo(({ name, status, cpu, memory, onAction, onManage }: ContainerItemProps) => {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (status !== prevStatus) {
    setPrevStatus(status);
    setLoading(false);
    setPendingAction(null);
  }

  // Universal safety timeout for any container action
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setPendingAction(null);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const handleAction = async (action: ContainerActionType) => {
    setLoading(true);
    setPendingAction(action);
    try {
      const result = await onAction(name, action);
      if (!result || !result.success) {
        setLoading(false);
        setPendingAction(null);
        if (result?.message) {
          alert(`Container ${action} error: ${result.message}`);
        }
      }
    } catch (err: unknown) {
      setLoading(false);
      setPendingAction(null);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to ${action} container: ${msg}`);
    }
  };

  const isRunning = status === "running";

  return (
    <>
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded border border-border bg-secondary/15 hover:bg-secondary/35 hover:border-border-hover transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status Indicator Dot */}
          <div
            className={`flex items-center justify-center p-1.5 rounded border shrink-0 ${
              isRunning
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <Box className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-xs sm:text-sm text-foreground truncate" title={name}>
                {name}
              </span>
              <Badge
                variant={isRunning ? "success" : "secondary"}
                className="text-[9px] uppercase tracking-wider px-1.5 py-0"
              >
                <span
                  className={`h-1 w-1 rounded-full mr-0.5 ${
                    isRunning ? "bg-emerald-400" : "bg-slate-400"
                  }`}
                />
                {status}
              </Badge>
            </div>

            {isRunning && (
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground font-mono tabular-nums">
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

        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          {loading ? (
            <div className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono text-muted-foreground">
              <Spinner size="sm" />
              <span className="capitalize">{pendingAction === "remove" ? "Deleting" : pendingAction || "Updating"}...</span>
            </div>
          ) : (
            <>
              {isRunning ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("stop")}
                    className="h-7 px-2 text-xs font-mono hover:border-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Square className="h-3 w-3 mr-1 fill-current" />
                    Stop
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAction("restart")}
                    className="h-7 px-2 text-xs font-mono hover:bg-accent"
                  >
                    <RotateCw className="h-3 w-3 mr-1" />
                    Restart
                  </Button>
                </>
              ) : (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleAction("start")}
                  className="h-7 px-2.5 text-xs font-mono"
                >
                  <Play className="h-3 w-3 mr-1 fill-current" />
                  Start
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onManage?.(name)}
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Manage & Edit Container"
              >
                <Sliders className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete Container"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Container"
        description={
          <div className="space-y-2">
            <div>
              Are you sure you want to delete container{" "}
              <span className="font-mono font-semibold text-foreground bg-secondary/80 px-1.5 py-0.5 rounded text-xs">
                {name}
              </span>
              ? This action cannot be undone.
            </div>
            {isRunning && (
              <div className="text-xs text-rose-400 font-medium">
                Note: Container is running and will be stopped and deleted.
              </div>
            )}
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={loading && pendingAction === "remove"}
        onConfirm={async () => {
          await handleAction("remove");
          setShowDeleteDialog(false);
        }}
      />
    </>
  );
});

ContainerItem.displayName = "ContainerItem";

export default ContainerItem;