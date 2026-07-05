export function refreshNavigationTitle(title: string) {
  uni.setNavigationBarTitle({ title });

  if (typeof document === "undefined") return;
  document.title = title;
  setTimeout(() => {
    const titleElement = document.querySelector(".uni-page-head__title");
    if (titleElement && titleElement.textContent !== title) titleElement.textContent = title;
  }, 0);
}
