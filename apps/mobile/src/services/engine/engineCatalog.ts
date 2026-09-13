import { fetchEngineCatalog, type EngineCatalog } from "./engineApi";

const CATALOG_TTL = 5 * 60_000;

let cachedCatalog: EngineCatalog | undefined;
let cachedAt = 0;
let pendingCatalog: Promise<EngineCatalog> | undefined;

export async function getEngineCatalog(options?: { force?: boolean }): Promise<EngineCatalog> {
  if (!options?.force && cachedCatalog && Date.now() - cachedAt < CATALOG_TTL) return cachedCatalog;
  if (!options?.force && pendingCatalog) return pendingCatalog;

  pendingCatalog = fetchEngineCatalog(options).then((catalog) => {
    cachedCatalog = catalog;
    cachedAt = Date.now();
    return catalog;
  });

  try {
    return await pendingCatalog;
  } finally {
    pendingCatalog = undefined;
  }
}

export function peekEngineCatalog() {
  return cachedCatalog;
}

export function resolveCatalogQualityId(catalog: EngineCatalog | undefined, label: string) {
  if (!catalog?.qualities.length) return undefined;
  return catalog.qualities.find((item) => item.label === label)?.id ?? catalog.qualities[0].id;
}

export function resolveCatalogRatioId(catalog: EngineCatalog | undefined, label: string) {
  if (!catalog?.ratios.length) return undefined;
  return catalog.ratios.find((item) => item.label === label)?.id ?? catalog.ratios[0].id;
}

export function resolveCatalogStyleId(catalog: EngineCatalog | undefined, name: string) {
  if (!catalog || !name) return undefined;
  return catalog.styles.find((item) => item.name === name)?.id;
}

export function catalogStyleNameById(catalog: EngineCatalog | undefined, styleId?: number) {
  if (!catalog || !styleId) return "";
  return catalog.styles.find((item) => item.id === styleId)?.name ?? "";
}
