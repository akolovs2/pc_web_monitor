import type { TaskItemProps } from "../../types/Metrics";
import { Badge, Button } from "../../components";
import { X } from "lucide-react";

const TaskItem = ({ pid, name, cpu, memory, status, onKill }: TaskItemProps) => {
  const isRunning = status.toLowerCase() === "running";

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{name}</span>
          <Badge
            variant={isRunning ? "success" : "secondary"}
            className="text-[10px] font-mono"
          >
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
          <span>PID: {pid}</span>
          <span>CPU: {cpu}%</span>
          <span>RAM: {memory}%</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onKill(pid, name)}
        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Kill Process"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TaskItem;