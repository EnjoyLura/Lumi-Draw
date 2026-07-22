export interface WorkVisibilityChange {
  id: number;
  status: "offline";
}

const listeners = new Set<(change: WorkVisibilityChange) => void>();

export function notifyWorkVisibilityChange(change: WorkVisibilityChange) {
  listeners.forEach((listener) => listener(change));
}

export function subscribeWorkVisibilityChange(listener: (change: WorkVisibilityChange) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
