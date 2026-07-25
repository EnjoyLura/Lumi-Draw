export interface GalleryWorksCreatedEvent {
  jobId: string;
  workIds: number[];
}

const listeners = new Set<(event: GalleryWorksCreatedEvent) => void>();
let latestEvent: GalleryWorksCreatedEvent | undefined;

export function notifyGalleryWorksCreated(event: GalleryWorksCreatedEvent) {
  latestEvent = event;
  listeners.forEach((listener) => listener(event));
}

export function subscribeGalleryWorksCreated(listener: (event: GalleryWorksCreatedEvent) => void) {
  listeners.add(listener);
  if (latestEvent) listener(latestEvent);
  return () => listeners.delete(listener);
}
