import assert from "node:assert/strict";
import test from "node:test";
import { AsyncHttpAdapter } from "./async-http.adapter";
import { providerConfigDefaults } from "../provider-config";
import type { ProviderConfig } from "../engine.types";

const adapter = new AsyncHttpAdapter("async");

function config(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    ...providerConfigDefaults("async-http"),
    baseUrl: "https://api.example.com/v1/tasks",
    ...overrides
  } as ProviderConfig;
}

test("回调与轮询共用平台的响应映射", () => {
  const payload = { data: { state: "DONE", urls: ["https://a/1.png", "https://a/2.png"] } };
  const event = adapter.parseCallback!(payload, config({
    responseMapping: { statusPath: "data.state", successValue: "DONE", failureValue: "ERROR", resultUrlPath: "data.urls[]" }
  }));
  assert.equal(event.state, "succeeded");
  assert.deepEqual(event.imageUrls, ["https://a/1.png", "https://a/2.png"]);
});

test("回调失败取映射的失败原因路径", () => {
  const event = adapter.parseCallback!({ data: { state: "ERROR", error: { message: "上游产能不足" } } }, config({
    responseMapping: { statusPath: "data.state", successValue: "DONE", failureValue: "ERROR", errorPath: "data.error.message" }
  }));
  assert.equal(event.state, "failed");
  assert.equal(event.errorMessage, "上游产能不足");
});

test("仅在开启真实进度时读取 progressPath，并夹到 0-100", () => {
  const withProgress = config({
    statusEnabled: true,
    responseMapping: { statusPath: "data.state", successValue: "DONE", failureValue: "ERROR", progressPath: "data.percent" }
  });
  assert.equal(adapter.parseCallback!({ data: { state: "RUNNING", percent: 142 } }, withProgress).progress, 100);
  assert.equal(adapter.parseCallback!({ data: { state: "RUNNING", percent: 38 } }, withProgress).progress, 38);

  const withoutProgress = { ...withProgress, statusEnabled: false };
  assert.equal(adapter.parseCallback!({ data: { state: "RUNNING", percent: 38 } }, withoutProgress).progress, undefined);
});
