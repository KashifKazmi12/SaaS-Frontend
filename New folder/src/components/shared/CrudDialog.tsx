import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  createTitle: string;
  editTitle: string;
  createSubmitLabel?: string;
  editSubmitLabel?: string;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
  className?: string;
}

export function CrudDialog({
  open,
  onOpenChange,
  editing,
  createTitle,
  editTitle,
  createSubmitLabel = "Create",
  editSubmitLabel = "Save changes",
  onSubmit,
  children,
  className,
}: CrudDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{editing ? editTitle : createTitle}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          {children}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              type="button"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {editing ? editSubmitLabel : createSubmitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
