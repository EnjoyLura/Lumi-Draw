import { ref } from "vue";

export type EmbeddedPrimaryTab = "home" | "plaza" | "gallery" | "mine";
export type EmbeddedSecondaryPage = "recharge" | "checkin";

export const activeEmbeddedPrimaryTab = ref<EmbeddedPrimaryTab>("home");
export const activeEmbeddedSecondaryPage = ref<EmbeddedSecondaryPage | null>(null);

export function setEmbeddedPrimaryTab(tab: EmbeddedPrimaryTab) {
  activeEmbeddedPrimaryTab.value = tab;
}

export function openEmbeddedSecondaryPage(page: EmbeddedSecondaryPage) {
  activeEmbeddedSecondaryPage.value = page;
}

export function closeEmbeddedSecondaryPage() {
  activeEmbeddedSecondaryPage.value = null;
}
