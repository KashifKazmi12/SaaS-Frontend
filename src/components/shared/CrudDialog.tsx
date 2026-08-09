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
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{editing ? editTitle : createTitle}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          {children}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? editSubmitLabel : createSubmitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
