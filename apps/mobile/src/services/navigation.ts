export function navigateBackOrRedirect(fallbackUrl: string) {
  try {
    if (getCurrentPages().length > 1) {
      uni.navigateBack();
      return;
    }
  } catch {
    // Fall through to the explicit destination when page stack is unavailable.
  }
  uni.redirectTo({ url: fallbackUrl });
}
