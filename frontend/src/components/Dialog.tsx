import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "secondary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  children,
  icon,
}) => {
  const isDestructive = variant === "destructive";

  const defaultIcon = isDestructive ? (
    <div className="p-2.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
      <AlertTriangle className="h-5 w-5" />
    </div>
  ) : (
    <div className="p-2.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
      <Info className="h-5 w-5" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md bg-card/95 border-border shadow-2xl">
        <div className="flex items-start gap-4">
          {icon ?? defaultIcon}
          <div className="space-y-2 flex-1">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-sm text-muted-foreground pt-1">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>

            {children && <div className="py-2">{children}</div>}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              {cancelText}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            loading={loading}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
            className={cn(
              "text-xs sm:text-sm font-medium",
              isDestructive && "shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            )}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogPortal,
};
