import { Alert, AlertDescription } from "@/components/ui/alert";

interface PageAlertsProps {
  error?: string;
  message?: string;
}

export function PageAlerts({ error, message }: PageAlertsProps) {
  if (!error && !message) return null;

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
