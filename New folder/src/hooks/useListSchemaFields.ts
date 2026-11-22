import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { listCustomColumns, listSchemaColumns } from "@/constants/entityFields";
import { ALL_FILTER } from "@/lib/listFilters";
import type { EntityFieldDefinition, EntitySchemaEntity } from "@/types";

function loadSchema(entity: EntitySchemaEntity, businessId: string) {
  if (entity === "product") return api.getProductSchema(businessId);
  if (entity === "category") return api.getCategorySchema(businessId);
  if (entity === "stock") return api.getStockSchema(businessId);
  if (entity === "order") return api.getOrderSchema({ groupId: businessId });
  return api.getCustomerSchema(businessId);
}

export function resolveListBusinessId(
  filterBusinessId: string,
  singleAssignedBusinessId?: string
) {
  if (filterBusinessId && filterBusinessId !== ALL_FILTER) return filterBusinessId;
  return singleAssignedBusinessId || "";
}

export function useListSchemaFields(
  entity: EntitySchemaEntity,
  businessId: string,
  options?: { includeRootKeys?: boolean }
) {
  const [fields, setFields] = useState<EntityFieldDefinition[]>([]);
  const includeRootKeys = Boolean(options?.includeRootKeys);

  useEffect(() => {
    if (!businessId) {
      setFields([]);
      return;
    }

    let cancelled = false;
    loadSchema(entity, businessId)
      .then((data) => {
        if (!cancelled) {
          setFields(
            includeRootKeys
              ? listSchemaColumns(data.fields, entity, true)
              : listCustomColumns(data.fields, entity)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });

    return () => {
      cancelled = true;
    };
  }, [entity, businessId, includeRootKeys]);

  return useMemo(() => fields, [fields]);
}
