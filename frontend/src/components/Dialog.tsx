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
    <div className="p-2 rounded bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
      <AlertTriangle className="h-4.5 w-4.5" />
    </div>
  ) : (
    <div className="p-2 rounded bg-primary/15 text-primary border border-primary/30 shrink-0">
      <Info className="h-4.5 w-4.5" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <div className="flex items-start gap-3.5">
          {icon ?? defaultIcon}
          <div className="space-y-1.5 flex-1">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              {description && (
                <DialogDescription asChild className="text-xs text-muted-foreground pt-0.5">
                  <div>{description}</div>
                </DialogDescription>
              )}
            </DialogHeader>

            {children && <div className="py-2">{children}</div>}
          </div>
        </div>

        <DialogFooter className="mt-3 gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="text-xs font-mono"
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
            className="text-xs font-mono"
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
