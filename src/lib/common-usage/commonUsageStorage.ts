import type { CommonUsageImportBundle, CommonUsageLayer, CommonUsageSource, ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";

export const COMMON_USAGE_STORAGE_KEY = "mitigation-planner-common-usage-v1";
export const COMMON_USAGE_UPDATED_EVENT = "common-usage-updated";

export type StoredCommonUsage = {
  sources: CommonUsageSource[];
  usages: ExternalActionUsage[];
  layers: CommonUsageLayer[];
};

const emptyStore: StoredCommonUsage = { sources: [], usages: [], layers: [] };

export function readCommonUsageStore(): StoredCommonUsage {
  if (typeof window === "undefined") return emptyStore;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMMON_USAGE_STORAGE_KEY) ?? "null") as StoredCommonUsage | null;
    return parsed ?? emptyStore;
  } catch {
    return emptyStore;
  }
}

function writeCommonUsageStore(store: StoredCommonUsage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMON_USAGE_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(COMMON_USAGE_UPDATED_EVENT));
}

export function saveCommonUsageBundle(bundle: CommonUsageImportBundle) {
  const store = readCommonUsageStore();
  writeCommonUsageStore({
    sources: [bundle.source, ...store.sources.filter((source) => source.id !== bundle.source.id)],
    usages: [...bundle.usages, ...store.usages.filter((usage) => usage.sourceId !== bundle.source.id)],
    layers: [bundle.layer, ...store.layers.filter((layer) => layer.id !== bundle.layer.id)]
  });
}

export function getPlanCommonUsage(planId: string, encounterTemplateId: string) {
  const store = readCommonUsageStore();
  const layers = store.layers.filter((layer) => layer.planId === planId && layer.encounterTemplateId === encounterTemplateId);
  const sourceIds = new Set(layers.map((layer) => layer.sourceId));
  return {
    layers,
    sources: store.sources.filter((source) => sourceIds.has(source.id)),
    usages: store.usages.filter((usage) => sourceIds.has(usage.sourceId))
  };
}

export function updateCommonUsageLayer(layer: CommonUsageLayer) {
  const store = readCommonUsageStore();
  writeCommonUsageStore({ ...store, layers: store.layers.map((item) => (item.id === layer.id ? layer : item)) });
}

export function updateExternalActionUsage(usage: ExternalActionUsage) {
  const store = readCommonUsageStore();
  writeCommonUsageStore({ ...store, usages: store.usages.map((item) => (item.id === usage.id ? usage : item)) });
}

export function exportCommonUsageJson() {
  return JSON.stringify(readCommonUsageStore(), null, 2);
}

export function importCommonUsageJson(store: StoredCommonUsage) {
  writeCommonUsageStore(store);
}
