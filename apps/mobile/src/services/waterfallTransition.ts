export type WaterfallTransitionDirection = "left" | "right";

export const WATERFALL_LOADING_FRAME_DELAY = 50;
export const WATERFALL_SWITCH_DELAY = 300;
export const WATERFALL_ANIMATION_DURATION = 450;

export function getWaterfallDirection(nextIndex: number, previousIndex: number): WaterfallTransitionDirection {
  return nextIndex > previousIndex ? "left" : "right";
}

export function getWaterfallAnimationClass(direction: WaterfallTransitionDirection) {
  return direction === "left" ? "wf-slide-left" : "wf-slide-right";
}
