import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

const Spinner = ({ size = "md", className }: SpinnerProps) => (
  <Loader2 className={cn("animate-spin text-muted-foreground", sizeMap[size], className)} />
);

export default Spinner;