import assert from "node:assert/strict";
import test from "node:test";
import { firstStringAtPath, stringValuesAtPath, valuesAtPath } from "./provider-response";

test("valuesAtPath 穿透被字符串化的 JSON 段", () => {
  const payload = { code: 200, data: { state: "success", resultJson: '{"resultUrls":["https://a/1.png","https://a/2.png"]}' } };
  assert.deepEqual(stringValuesAtPath(payload, "data.resultJson.resultUrls[]"), ["https://a/1.png", "https://a/2.png"]);
  assert.equal(firstStringAtPath(payload, "data.resultJson.resultUrls[]"), "https://a/1.png");
});

test("数组展开后的元素同样支持 JSON 字符串下钻", () => {
  const payload = { items: [{ blob: '{"url":"https://a/3.png"}' }] };
  assert.deepEqual(valuesAtPath(payload, "items[].blob.url"), ["https://a/3.png"]);
});

test("普通字符串不会被误当作 JSON，非法 JSON 原样保留", () => {
  const payload = { data: { status: "SUCCESS", broken: '{"url":' } };
  assert.equal(firstStringAtPath(payload, "data.status"), "SUCCESS");
  assert.deepEqual(valuesAtPath(payload, "data.broken.url"), []);
});
