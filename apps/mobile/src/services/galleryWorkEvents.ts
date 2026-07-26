export interface GalleryWorksCreatedEvent {
  jobId: string;
  workIds: number[];
}

export interface GalleryGenerateTaskStartedEvent {
  jobId: string;
  prompt: string;
  model: string;
  count: number;
  ratio: string;
  quality: string;
  progress: number;
  stage: string;
  createdAt: string;
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
const generateTaskStartedListeners = new Set<(event: GalleryGenerateTaskStartedEvent) => void>();
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

export function notifyGalleryGenerateTaskStarted(event: GalleryGenerateTaskStartedEvent) {
  generateTaskStartedListeners.forEach((listener) => listener(event));
}

export function subscribeGalleryGenerateTaskStarted(listener: (event: GalleryGenerateTaskStartedEvent) => void) {
  generateTaskStartedListeners.add(listener);
  return () => generateTaskStartedListeners.delete(listener);
}

export function notifyGalleryWorkUpdated(event: GalleryWorkUpdatedEvent) {
  updatedListeners.forEach((listener) => listener(event));
}

export function subscribeGalleryWorkUpdated(listener: (event: GalleryWorkUpdatedEvent) => void) {
  updatedListeners.add(listener);
  return () => updatedListeners.delete(listener);
}
