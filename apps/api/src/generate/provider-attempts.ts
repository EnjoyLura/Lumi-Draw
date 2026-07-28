export type ProviderAttempt = {
  providerId: string;
  providerName: string;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
};

export function normalizeProviderCandidates(value: unknown, fallbackProvider = "") {
  const candidates = (Array.isArray(value) ? value : [])
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter(Boolean);
  if (fallbackProvider.trim()) candidates.push(fallbackProvider.trim());
  return candidates.filter((providerId, index, all) => all.indexOf(providerId) === index);
}

export function normalizeProviderAttempts(value: unknown): ProviderAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const attempt = item as Partial<ProviderAttempt>;
    if (!attempt.providerId || !attempt.startedAt || !["running", "succeeded", "failed"].includes(String(attempt.status))) return [];
    return [{
      providerId: String(attempt.providerId),
      providerName: String(attempt.providerName || attempt.providerId),
      status: attempt.status as ProviderAttempt["status"],
      startedAt: String(attempt.startedAt),
      ...(attempt.finishedAt ? { finishedAt: String(attempt.finishedAt) } : {}),
      ...(Number.isFinite(Number(attempt.durationMs)) ? { durationMs: Math.max(0, Number(attempt.durationMs)) } : {}),
      ...(attempt.error ? { error: String(attempt.error).slice(0, 500) } : {})
    }];
  });
}

export function beginProviderAttempt(value: unknown, providerId: string, providerName: string, now = new Date()) {
  const attempts = normalizeProviderAttempts(value);
  const current = attempts[attempts.length - 1];
  if (current?.status === "running" && current.providerId === providerId) return attempts;
  return [...attempts, {
    providerId,
    providerName: providerName || providerId,
    status: "running" as const,
    startedAt: now.toISOString()
  }];
}

export function finishProviderAttempt(
  value: unknown,
  status: "succeeded" | "failed",
  error = "",
  now = new Date()
) {
  const attempts = normalizeProviderAttempts(value);
  const index = [...attempts].reverse().findIndex((attempt) => attempt.status === "running");
  if (index < 0) return attempts;
  const actualIndex = attempts.length - 1 - index;
  const startedAt = new Date(attempts[actualIndex].startedAt);
  attempts[actualIndex] = {
    ...attempts[actualIndex],
    status,
    finishedAt: now.toISOString(),
    durationMs: Number.isNaN(startedAt.getTime()) ? 0 : Math.max(0, now.getTime() - startedAt.getTime()),
    ...(status === "failed" && error ? { error: error.slice(0, 500) } : {})
  };
  return attempts;
}

export function decideProviderFailure(input: {
  durationMs: number;
  quickFailureWindowMs: number;
  attemptsForProvider: number;
  maxAttemptsPerProvider: number;
  retryable: boolean;
  hasNextProvider: boolean;
}) {
  if (!input.retryable || input.durationMs > input.quickFailureWindowMs) return "fail" as const;
  if (input.attemptsForProvider < input.maxAttemptsPerProvider) return "retry-same" as const;
  return input.hasNextProvider ? "fallback" as const : "fail" as const;
}
