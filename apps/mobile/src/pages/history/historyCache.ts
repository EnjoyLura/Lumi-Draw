import type { BackendWorkCard } from "../../services/social";

interface HistorySnapshot {
  userId: number;
  items: BackendWorkCard[];
  updatedAt: number;
}

let snapshot: HistorySnapshot | undefined;

export function getHistorySnapshot(userId: number) {
  return snapshot?.userId === userId ? snapshot : undefined;
}

export function setHistorySnapshot(userId: number, items: BackendWorkCard[]) {
  snapshot = { userId, items, updatedAt: Date.now() };
  return snapshot;
}

export function clearHistorySnapshot(userId?: number) {
  if (userId === undefined || snapshot?.userId === userId) snapshot = undefined;
}
