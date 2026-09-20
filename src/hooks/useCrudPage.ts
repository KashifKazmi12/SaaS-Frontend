import { useCallback, useState } from "react";
import { useConfirm } from "@/components/shared";

interface RunMutationOptions {
  successMessage: string;
  closeDialog?: boolean;
  reload?: () => Promise<void>;
  fallbackError?: string;
}

interface RunDeleteOptions {
  successMessage: string;
  reload: () => Promise<void>;
  canDelete?: () => boolean;
  fallbackError?: string;
}

export function useCrudPage<T>() {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const clearFeedback = useCallback(() => {
    setError("");
    setMessage("");
  }, []);

  const runLoad = useCallback(async (loader: () => Promise<void>, fallbackError: string) => {
    setLoading(true);
    setError("");
    try {
      await loader();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      setLoading(false);
    }
  }, []);

  const runMutation = useCallback(
    async (mutation: () => Promise<void>, options: RunMutationOptions) => {
      clearFeedback();
      try {
        await mutation();
        setMessage(options.successMessage);
        if (options.closeDialog !== false) {
          setDialogOpen(false);
        }
        if (options.reload) {
          await options.reload();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : options.fallbackError ?? "Unable to complete request."
        );
      }
    },
    [clearFeedback]
  );

  const runDelete = useCallback(
    async (itemName: string, mutation: () => Promise<void>, options: RunDeleteOptions) => {
      if (options.canDelete && !options.canDelete()) return;

      const confirmed = await confirm({
        title: `Remove ${itemName}?`,
        description: "This action cannot be undone.",
        confirmLabel: "Remove",
        variant: "destructive",
      });
      if (!confirmed) return;

      await runMutation(mutation, {
        successMessage: options.successMessage,
        closeDialog: false,
        reload: options.reload,
        fallbackError: options.fallbackError,
      });
    },
    [confirm, runMutation]
  );

  const startCreate = useCallback((reset?: () => void) => {
    setEditing(null);
    reset?.();
    setDialogOpen(true);
  }, []);

  const startEdit = useCallback((item: T, populate: (item: T) => void) => {
    setEditing(item);
    populate(item);
    setDialogOpen(true);
  }, []);

  return {
    loading,
    error,
    message,
    dialogOpen,
    setDialogOpen,
    editing,
    clearFeedback,
    runLoad,
    runMutation,
    runDelete,
    startCreate,
    startEdit,
    setMessage,
    setError,
  };
}
