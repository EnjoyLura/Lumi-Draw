const staleWorkIds = new Set<number>();

export function markWorkDetailStale(workId: number) {
  if (workId > 0) staleWorkIds.add(workId);
}

export function consumeWorkDetailStale(workId: number) {
  return staleWorkIds.delete(workId);
}
