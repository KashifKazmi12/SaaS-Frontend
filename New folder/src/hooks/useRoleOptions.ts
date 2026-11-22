import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { RoleRecord } from "@/types";

export interface RoleOption {
  id: string;
  name: string;
}

interface UseRoleOptionsParams {
  roles?: RoleRecord[];
}

export function useRoleOptions({ roles: externalRoles }: UseRoleOptionsParams = {}) {
  const [fetchedRoles, setFetchedRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(!externalRoles);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalRoles) {
      setFetchedRoles(externalRoles.map((role) => ({ id: role._id, name: role.name })));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getRoleOptions()
      .then((data) => {
        if (cancelled) return;
        setFetchedRoles(data.items.map((role) => ({ id: role._id, name: role.name })));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load roles.");
        setFetchedRoles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [externalRoles]);

  const options = externalRoles
    ? externalRoles.map((role) => ({ id: role._id, name: role.name }))
    : fetchedRoles;

  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );

  return {
    options,
    labelById,
    loading: externalRoles ? false : loading,
    error,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
