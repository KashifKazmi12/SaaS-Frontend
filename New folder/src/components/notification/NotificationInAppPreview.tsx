import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NotificationInAppPreviewProps {
  title: string;
  body: string;
  className?: string;
}

export function NotificationInAppPreview({ title, body, className }: NotificationInAppPreviewProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm font-medium">In-app preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="rounded-xl border bg-background p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-snug">{title || "Notification title"}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {body || "Your in-app message will appear here."}
              </p>
              <p className="text-[11px] text-muted-foreground">Just now</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
