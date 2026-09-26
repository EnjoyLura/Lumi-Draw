import assert from "node:assert/strict";
import test from "node:test";
import { decideFailure, isProviderDegraded } from "./engine-failover";
import { PROVIDER_DEGRADE_COOLDOWN_MS, PROVIDER_DEGRADE_FAILURE_THRESHOLD } from "./engine.types";

const now = new Date("2026-09-26T10:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const failed = (finishedAt: Date) => ({ state: "failed", finishedAt });
const succeeded = (finishedAt: Date) => ({ state: "succeeded", finishedAt });

function streak(count: number, newestMinutesAgo = 1, gapMinutes = 5) {
  return Array.from({ length: count }, (_, index) => failed(minutesAgo(newestMinutesAgo + index * gapMinutes)));
}

test("degrades only after the full consecutive failure sample inside the cooldown window", () => {
  assert.equal(isProviderDegraded(streak(PROVIDER_DEGRADE_FAILURE_THRESHOLD), now), true);
  assert.equal(isProviderDegraded(streak(PROVIDER_DEGRADE_FAILURE_THRESHOLD - 1), now), false);
});

test("any success inside the recent window clears the degradation", () => {
  const recent = [
    succeeded(minutesAgo(1)),
    ...streak(PROVIDER_DEGRADE_FAILURE_THRESHOLD - 1, 6)
  ];
  assert.equal(isProviderDegraded(recent, now), false);
});

test("releases the route once the cooldown expires so it can be probed again", () => {
  const stale = streak(PROVIDER_DEGRADE_FAILURE_THRESHOLD, PROVIDER_DEGRADE_COOLDOWN_MS / 60_000 + 1);
  assert.equal(isProviderDegraded(stale, now), false);
});

test("ignores in-flight rows without a finish time", () => {
  const recent = [{ state: "failed", finishedAt: null }, ...streak(PROVIDER_DEGRADE_FAILURE_THRESHOLD - 1, 6)];
  assert.equal(isProviderDegraded(recent, now), false);
});

test("timeout on a possibly-billed submit fails the job instead of silently re-billing upstream", () => {
  assert.equal(
    decideFailure({
      kind: "timeout",
      maybeBilled: true,
      latencyMs: 0,
      attemptsForProvider: 1,
      maxAttemptsPerProvider: 2,
      quickFailureWindowMs: 15_000,
      hasNextProvider: true
    }),
    "fail"
  );
});

test("a fast unrouted network error retries the same route before falling back", () => {
  assert.equal(
    decideFailure({
      kind: "network",
      maybeBilled: false,
      latencyMs: 1_200,
      attemptsForProvider: 1,
      maxAttemptsPerProvider: 2,
      quickFailureWindowMs: 15_000,
      hasNextProvider: true
    }),
    "retry-same"
  );
});
