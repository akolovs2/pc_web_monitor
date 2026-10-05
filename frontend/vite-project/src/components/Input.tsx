import React from "react";
import { Input as ShadcnInput, type InputProps as ShadcnInputProps } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<ShadcnInputProps, "error"> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => (
    <div className="space-y-1.5 text-left w-full">
      {label && (
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label}
        </Label>
      )}
      <ShadcnInput
        id={id}
        ref={ref}
        error={!!error}
        className={cn("bg-background/80 border-input transition-all focus-visible:ring-primary", className)}
        {...props}
      />
      {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export default Input;