import { ref } from "vue";

export type EmbeddedPrimaryTab = "home" | "plaza" | "gallery" | "mine";

export const activeEmbeddedPrimaryTab = ref<EmbeddedPrimaryTab>("home");

export function setEmbeddedPrimaryTab(tab: EmbeddedPrimaryTab) {
  activeEmbeddedPrimaryTab.value = tab;
}
