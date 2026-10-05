/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide transition-colors focus:outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary/15 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-400",
        outline: "border-border text-muted-foreground",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
