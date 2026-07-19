import assert from "node:assert/strict";
import test from "node:test";
import { extractQualityTier, normalizeProviderRouting, resolveProviderId } from "./provider-routing";

test("extracts the standard quality tier from administrator labels", () => {
  assert.equal(extractQualityTier("全高清 1K"), "1K");
  assert.equal(extractQualityTier("超清2k"), "2K");
  assert.equal(extractQualityTier("超高清 4K"), "4K");
});

test("uses the configured provider for the selected quality tier", () => {
  const routing = { "1K": "fast-api", "4K": "quality-api" };
  assert.equal(resolveProviderId("default-api", routing, "全高清 1K"), "fast-api");
  assert.equal(resolveProviderId("default-api", routing, "超高清 4K"), "quality-api");
});

test("falls back to the model default provider for an unconfigured tier", () => {
  assert.equal(resolveProviderId("default-api", { "1K": "fast-api" }, "超清 2K"), "default-api");
});

test("drops unsupported, blank, and malformed routing entries", () => {
  assert.deepEqual(normalizeProviderRouting({ "1K": " fast-api ", "2K": "", "8K": "other" }), { "1K": "fast-api" });
  assert.deepEqual(normalizeProviderRouting(null), {});
});
