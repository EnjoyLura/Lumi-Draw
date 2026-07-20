import assert from "node:assert/strict";
import test from "node:test";
import { calculatePartialRefund, resolveProviderResultMode } from "./generate.service";

test("refunds the missing share when a provider returns fewer images", () => {
  assert.deepEqual(calculatePartialRefund(45, 0, 2, 1), { missingCount: 1, refundCredits: 22 });
  assert.deepEqual(calculatePartialRefund(60, 0, 4, 2), { missingCount: 2, refundCredits: 30 });
});

test("does not refund complete output and never exceeds the remaining charge", () => {
  assert.deepEqual(calculatePartialRefund(45, 0, 2, 2), { missingCount: 0, refundCredits: 0 });
  assert.deepEqual(calculatePartialRefund(45, 40, 2, 0), { missingCount: 2, refundCredits: 5 });
});

test("routes URL results through the API server and Base64 results through FC", () => {
  assert.equal(resolveProviderResultMode("url", "change2pro", "sync", {}), "url");
  assert.equal(resolveProviderResultMode("base64", "change2pro", "sync", {}), "base64");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", { response_format: "url" }), "url");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", { response_format: "b64_json" }), "base64");
});

test("defaults asynchronous providers to URL and synchronous image providers to Base64", () => {
  assert.equal(resolveProviderResultMode("auto", "ainb", "async", {}), "url");
  assert.equal(resolveProviderResultMode("auto", "kie", "async", {}), "url");
  assert.equal(resolveProviderResultMode("auto", "change2pro", "sync", {}), "base64");
});
