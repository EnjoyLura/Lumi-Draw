import { computed, ref } from "vue";
import type { HomeUser, HomeWork } from "../pages/home/homeData";

export interface WorkDetailOverlaySeed {
  work: HomeWork;
  user: HomeUser;
}

const seed = ref<WorkDetailOverlaySeed | null>(null);
const open = ref(false);

/**
 * The primary shell owns this layer, so opening a work never has to create a
 * new mini-program page. The source card stays mounted underneath it and the
 * first detail frame can be painted from the exact same cached data.
 */
export const workDetailOverlay = {
  open,
  seed: computed(() => seed.value),
  show(next: WorkDetailOverlaySeed) {
    seed.value = { work: { ...next.work }, user: { ...next.user } };
    open.value = true;
  },
  close() {
    open.value = false;
  }
};
