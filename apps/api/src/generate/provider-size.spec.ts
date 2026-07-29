import assert from "node:assert/strict";
import test from "node:test";
import { buildProviderSizeParams, normalizeProviderResolution } from "./provider-size";

test("builds a single pixel size parameter by default", () => {
  assert.deepEqual(buildProviderSizeParams("16:9", "超高清 4K", "3840x2160"), {
    size: "3840x2160"
  });
});

test("builds separate custom ratio and resolution parameters", () => {
  assert.deepEqual(buildProviderSizeParams("16:9", "超高清 4K", "3840x2160", {
    mode: "ratio-resolution",
    ratioField: "aspect_ratio",
    resolutionField: "quality_level"
  }), {
    aspect_ratio: "16:9",
    quality_level: "4k"
  });
});

test("normalizes administrator quality labels to provider tiers", () => {
  assert.equal(normalizeProviderResolution("全高清 1K"), "1k");
  assert.equal(normalizeProviderResolution("超清 2K"), "2k");
  assert.equal(normalizeProviderResolution("超高清 4K"), "4k");
});
