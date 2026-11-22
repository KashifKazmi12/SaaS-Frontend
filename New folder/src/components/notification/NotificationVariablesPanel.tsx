import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationVariable } from "@/types";
import { cn } from "@/lib/utils";

interface NotificationVariablesPanelProps {
  variables: NotificationVariable[];
  className?: string;
  compact?: boolean;
}

export function NotificationVariablesPanel({
  variables,
  className,
  compact = false,
}: NotificationVariablesPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyToken(key: string) {
    await navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        <div>
          <p className="text-sm font-medium">Variables</p>
          <p className="text-xs text-muted-foreground">
            Click to copy a token into your message.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <Button
              key={variable.key}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 font-mono text-[11px]"
              onClick={() => copyToken(variable.key)}
            >
              {copiedKey === variable.key ? (
                <Check className="mr-1 size-3" />
              ) : (
                <Copy className="mr-1 size-3" />
              )}
              {`{{${variable.key}}}`}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium">Available variables</p>
        <p className="text-xs text-muted-foreground">
          Shared across in-app and email content.
        </p>
      </div>
      <div className="space-y-2">
        {variables.map((variable) => (
          <div
            key={variable.key}
            className="rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{variable.label}</p>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {`{{${variable.key}}}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{variable.description}</p>
                <p className="text-xs">
                  Example: <span className="font-medium">{variable.example}</span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => copyToken(variable.key)}
              >
                {copiedKey === variable.key ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
