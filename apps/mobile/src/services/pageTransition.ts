const TAB_ORDER: Record<string, number> = {
  "pages/home/index": 0,
  "pages/plaza/index": 1,
  "pages/create/index": 2,
  "pages/gallery/index": 3,
  "pages/mine/index": 4
};

const ANIM_CLASSES = ["page-anim-tab-right", "page-anim-tab-left", "page-anim-sub-in", "page-anim-back"];

let prevRoute = "";

function normalize(route: string) {
  return route.replace(/^\//, "");
}

function resolveClass(route: string): string {
  const isTab = route in TAB_ORDER;
  const prevIsTab = prevRoute in TAB_ORDER;

  if (!prevRoute || prevRoute === route) return "";
  if (isTab && prevIsTab) {
    return TAB_ORDER[route] >= TAB_ORDER[prevRoute] ? "page-anim-tab-right" : "page-anim-tab-left";
  }
  if (!isTab) return "page-anim-sub-in";
  return "page-anim-back";
}

function findActivePageRoot(): HTMLElement | null {
  const bodies = Array.from(document.querySelectorAll("uni-page-body"));
  for (let i = bodies.length - 1; i >= 0; i -= 1) {
    const root = bodies[i].firstElementChild as HTMLElement | null;
    if (root && root.offsetParent !== null) return root;
  }
  const last = bodies[bodies.length - 1];
  return (last?.firstElementChild as HTMLElement | null) ?? null;
}

export function playPageEnter(route: string) {
  const current = normalize(route);
  const cls = resolveClass(current);
  prevRoute = current;

  if (!cls) return;

  requestAnimationFrame(() => {
    const el = findActivePageRoot();
    if (!el || !el.classList) return;

    ANIM_CLASSES.forEach((name) => el.classList.remove(name));
    void el.offsetWidth;
    el.classList.add(cls);

    const clear = () => el.classList.remove(cls);
    el.addEventListener("animationend", clear, { once: true });
    setTimeout(clear, 720);
  });
}
