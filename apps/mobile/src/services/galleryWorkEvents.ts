export interface GalleryWorksCreatedEvent {
  jobId: string;
  workIds: number[];
}

export interface GalleryWorkUpdatedEvent {
  workId: number;
  returnRoute?: string;
  patch: {
    title?: string;
    description?: string;
    prompt?: string;
    ratio?: string;
    quality?: string;
    modelId?: string;
    modelName?: string;
    styleName?: string;
    tags?: string[];
    published?: boolean;
    status?: string;
  };
}

const listeners = new Set<(event: GalleryWorksCreatedEvent) => void>();
const updatedListeners = new Set<(event: GalleryWorkUpdatedEvent) => void>();
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

export function notifyGalleryWorkUpdated(event: GalleryWorkUpdatedEvent) {
  updatedListeners.forEach((listener) => listener(event));
}

export function subscribeGalleryWorkUpdated(listener: (event: GalleryWorkUpdatedEvent) => void) {
  updatedListeners.add(listener);
  return () => updatedListeners.delete(listener);
}
