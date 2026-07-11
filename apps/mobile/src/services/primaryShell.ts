import { ref } from "vue";

export type EmbeddedPrimaryTab = "home" | "create" | "plaza" | "gallery" | "mine";

export const activeEmbeddedPrimaryTab = ref<EmbeddedPrimaryTab>("home");
export const createRouteQuery = ref<Record<string, string>>({});
let createReturnTab: Exclude<EmbeddedPrimaryTab, "create"> = "home";

export function setEmbeddedPrimaryTab(tab: EmbeddedPrimaryTab) {
  activeEmbeddedPrimaryTab.value = tab;
}

export function openEmbeddedCreate(query: Record<string, string> = {}) {
  if (activeEmbeddedPrimaryTab.value !== "create") createReturnTab = activeEmbeddedPrimaryTab.value;
  createRouteQuery.value = query;
  activeEmbeddedPrimaryTab.value = "create";
}

export function closeEmbeddedCreate() {
  activeEmbeddedPrimaryTab.value = createReturnTab;
}
