import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotificationEmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  html: string;
}

export function NotificationEmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  html,
}: NotificationEmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Email preview</DialogTitle>
          <DialogDescription className="truncate">{subject}</DialogDescription>
        </DialogHeader>
        <div className="bg-muted/30 p-4">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <iframe title="Email preview" srcDoc={html} className="h-[70vh] w-full bg-white" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
