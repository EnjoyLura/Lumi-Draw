import assert from "node:assert/strict";
import test from "node:test";
import { beginProviderAttempt, decideProviderFailure, finishProviderAttempt, normalizeProviderCandidates } from "./provider-attempts";

test("normalizes provider candidates and keeps priority order", () => {
  assert.deepEqual(normalizeProviderCandidates([" api-1 ", "api-2", "api-1"], "api-3"), ["api-1", "api-2", "api-3"]);
});

test("records a provider attempt lifecycle", () => {
  const started = beginProviderAttempt([], "api-1", "主线路", new Date("2026-07-28T00:00:00.000Z"));
  const finished = finishProviderAttempt(started, "failed", "timeout", new Date("2026-07-28T00:00:03.500Z"));
  assert.deepEqual(finished, [{
    providerId: "api-1",
    providerName: "主线路",
    status: "failed",
    startedAt: "2026-07-28T00:00:00.000Z",
    finishedAt: "2026-07-28T00:00:03.500Z",
    durationMs: 3500,
    error: "timeout"
  }]);
});

test("retries only quick failures and falls back after the second attempt", () => {
  const base = { durationMs: 3000, quickFailureWindowMs: 8000, maxAttemptsPerProvider: 2, retryable: true, hasNextProvider: true };
  assert.equal(decideProviderFailure({ ...base, attemptsForProvider: 1 }), "retry-same");
  assert.equal(decideProviderFailure({ ...base, attemptsForProvider: 2 }), "fallback");
  assert.equal(decideProviderFailure({ ...base, durationMs: 60_000, attemptsForProvider: 1 }), "fail");
  assert.equal(decideProviderFailure({ ...base, retryable: false, attemptsForProvider: 1 }), "fail");
});
