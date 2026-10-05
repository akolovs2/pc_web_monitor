import React from "react";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  color?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const getDefaultIndicatorClass = (value: number): string => {
  if (value < 70) return "bg-emerald-500";
  if (value < 85) return "bg-amber-500";
  return "bg-rose-500";
};

const sizeClasses = {
  sm: "h-1 rounded-none",
  md: "h-1.5 rounded-sm",
  lg: "h-2.5 rounded-sm",
};

const ProgressBar = ({
  value,
  color,
  showLabel = false,
  size = "md",
  className,
}: ProgressBarProps) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <Progress
        value={clampedValue}
        className={cn("bg-secondary/70 border border-border/40", sizeClasses[size])}
        indicatorClassName={color ? "" : getDefaultIndicatorClass(clampedValue)}
        style={color ? ({ "--custom-color": color } as React.CSSProperties) : undefined}
      />
      {showLabel && (
        <span className="block text-xs font-mono font-medium text-muted-foreground text-right">
          {clampedValue.toFixed(1)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;