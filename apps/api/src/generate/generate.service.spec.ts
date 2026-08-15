import assert from "node:assert/strict";
import test from "node:test";
import { calculatePartialRefund, resolveProviderResultMode, transferRetryDelayMs, userFacingGenerateError, userFacingGenerateStageText } from "./generate.service";
import { decideProviderFailure } from "./provider-attempts";

test("refunds the missing share when a provider returns fewer images", () => {
  assert.deepEqual(calculatePartialRefund(45, 0, 2, 1), { missingCount: 1, refundCredits: 22 });
  assert.deepEqual(calculatePartialRefund(60, 0, 4, 2), { missingCount: 2, refundCredits: 30 });
});

test("does not refund complete output and never exceeds the remaining charge", () => {
  assert.deepEqual(calculatePartialRefund(45, 0, 2, 2), { missingCount: 0, refundCredits: 0 });
  assert.deepEqual(calculatePartialRefund(45, 40, 2, 0), { missingCount: 2, refundCredits: 5 });
});

test("keeps explicit URL and Base64 routes while auto inspects the single provider response", () => {
  assert.equal(resolveProviderResultMode("url", "change2pro", "sync", {}), "url");
  assert.equal(resolveProviderResultMode("base64", "change2pro", "sync", {}), "base64");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", { response_format: "url" }), "auto");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", { response_format: "b64_json" }), "auto");
});

test("defaults asynchronous providers to URL and synchronous image providers to auto", () => {
  assert.equal(resolveProviderResultMode("auto", "ainb", "async", {}), "url");
  assert.equal(resolveProviderResultMode("auto", "kie", "async", {}), "url");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", {}), "auto");
});

test("uses bounded persistent retry backoff for image transfers", () => {
  assert.equal(transferRetryDelayMs(1), 60_000);
  assert.equal(transferRetryDelayMs(2), 3 * 60_000);
  assert.equal(transferRetryDelayMs(4), 30 * 60_000);
  assert.equal(transferRetryDelayMs(99), 30 * 60_000);
});

test("falls back instead of repeating a provider after an upstream response", () => {
  assert.equal(decideProviderFailure({
    durationMs: 800,
    quickFailureWindowMs: 15_000,
    attemptsForProvider: 1,
    maxAttemptsPerProvider: 2,
    retryable: true,
    retrySameProvider: false,
    hasNextProvider: true
  }), "fallback");
});

test("converts provider errors and progress stages to user-facing Chinese", () => {
  assert.equal(userFacingGenerateError("provider network request failed"), "生成平台连接超时，请稍后重试");
  assert.equal(userFacingGenerateStageText("Submitted to KIE", "running"), "任务已提交，正在生成");
  assert.equal(userFacingGenerateStageText("Generation failed", "failed"), "生成失败");
});
