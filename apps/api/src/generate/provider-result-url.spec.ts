import assert from "node:assert/strict";
import test from "node:test";
import { rewriteProviderResultUrl } from "./provider-result-url";

test("rewrites only an exact HTTPS result host and preserves the resource path", () => {
  const result = rewriteProviderResultUrl(
    "https://files.toapis.com/images/task/output.png?token=abc",
    [{ sourceHost: "files.toapis.com", targetHost: "files.toapis.cn" }]
  );

  assert.equal(result.url, "https://files.toapis.cn/images/task/output.png?token=abc");
  assert.equal(result.fallbackUrl, "https://files.toapis.com/images/task/output.png?token=abc");
});

test("does not rewrite subdomains, unrelated hosts, or non-HTTPS URLs", () => {
  const rules = [{ sourceHost: "files.toapis.com", targetHost: "files.toapis.cn" }];

  assert.equal(rewriteProviderResultUrl("https://cdn.files.toapis.com/a.png", rules).fallbackUrl, "");
  assert.equal(rewriteProviderResultUrl("https://example.com/a.png", rules).fallbackUrl, "");
  assert.equal(rewriteProviderResultUrl("http://files.toapis.com/a.png", rules).fallbackUrl, "");
});
