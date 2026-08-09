import { useMemo } from "react";
import type { ModuleRecord } from "@/types";

export interface ModuleOption {
  id: string;
  name: string;
}

interface UseModuleOptionsParams {
  modules?: ModuleRecord[];
  parentOnly?: boolean;
}

export function useModuleOptions({ modules = [], parentOnly = false }: UseModuleOptionsParams) {
  const options = useMemo(() => {
    const source = parentOnly ? modules.filter((moduleItem) => !moduleItem.isSubModule) : modules;
    return source.map((moduleItem) => ({ id: moduleItem._id, name: moduleItem.name }));
  }, [modules, parentOnly]);

  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );

  return {
    options,
    labelById,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
