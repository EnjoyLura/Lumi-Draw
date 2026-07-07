type NavigateToOptions = UniApp.NavigateToOptions & {
  animationType?: string;
  animationDuration?: number;
};

export function navigateToPage(options: UniApp.NavigateToOptions) {
  uni.navigateTo({
    animationType: "none",
    animationDuration: 0,
    ...options
  } as NavigateToOptions);
}

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
