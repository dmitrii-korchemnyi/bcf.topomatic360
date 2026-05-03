import type { InternalBcfComponentRef } from "../domain/model";

export function readSelectedComponents(cadview: unknown): { components: InternalBcfComponentRef[]; warnings: string[] } {
  const warnings: string[] = [];
  const selected = readUnknownSelection(cadview);

  if (selected.length === 0) {
    warnings.push("Предупреждение: нет components");
  }

  if (selected.length > 1000) {
    warnings.push("Предупреждение: выбрано больше 1000 components");
  }

  return {
    components: selected.map(toComponentRef).filter((component): component is InternalBcfComponentRef => component !== undefined),
    warnings
  };
}

function readUnknownSelection(cadview: unknown): unknown[] {
  if (!isRecord(cadview)) {
    return [];
  }

  const candidates = [cadview.selection, cadview.selectedObjects, cadview.selected, cadview.objects];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function toComponentRef(value: unknown): InternalBcfComponentRef | undefined {
  if (typeof value === "string") {
    return { ifcGuid: value };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const ifcGuid = stringField(value, "ifcGuid") ?? stringField(value, "guid") ?? stringField(value, "globalId");
  const originatingSystem = stringField(value, "originatingSystem");
  const authoringToolId = stringField(value, "authoringToolId") ?? stringField(value, "id");

  if (!ifcGuid && !authoringToolId) {
    return undefined;
  }

  return { ifcGuid, originatingSystem, authoringToolId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: Record<string, unknown>, field: string): string | undefined {
  return typeof value[field] === "string" ? value[field] : undefined;
}
