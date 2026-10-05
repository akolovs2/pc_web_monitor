/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-100 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/40 shadow-sm hover:brightness-110",
        destructive:
          "bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30",
        outline:
          "border border-border bg-secondary/30 text-foreground hover:bg-secondary hover:border-border-hover",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/80 hover:bg-secondary/80 hover:border-border",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25",
      },
      size: {
        default: "h-8.5 px-3.5 py-1.5 text-xs sm:text-sm",
        sm: "h-7.5 rounded px-2.5 text-xs",
        lg: "h-9.5 rounded px-5 text-sm",
        icon: "h-8 w-8 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const renderLoadingContent = () => {
      if (loadingText) {
        return (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span className="truncate">{loadingText}</span>
          </>
        );
      }

      if (typeof children === "string") {
        return (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span className="truncate">{children}</span>
          </>
        );
      }

      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span className="truncate">Loading...</span>
        </>
      );
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? renderLoadingContent() : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
