import assert from "node:assert/strict";
import test from "node:test";
import { decryptWechatSessionKey, encryptWechatSessionKey } from "./session-secret";

test("wechat session key encryption round-trips without storing plaintext", () => {
  const masterSecret = "test-master-secret-that-is-longer-than-32-chars";
  const sessionKey = "wechat-session-key-value";
  const encrypted = encryptWechatSessionKey(sessionKey, masterSecret);

  assert.notEqual(encrypted, sessionKey);
  assert.equal(encrypted.includes(sessionKey), false);
  assert.equal(decryptWechatSessionKey(encrypted, masterSecret), sessionKey);
  assert.throws(() => decryptWechatSessionKey(encrypted, `${masterSecret}-wrong`));
});
