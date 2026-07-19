import assert from "node:assert/strict";
import test from "node:test";
import { decryptProviderApiKey, encryptProviderApiKey, providerApiKeyHint } from "./provider-secret";

const MASTER = "test-generation-provider-master-secret-1234567890";

test("encrypts provider keys without retaining plaintext and decrypts them", () => {
  const plaintext = "sk-provider-secret-value";
  const encrypted = encryptProviderApiKey(plaintext, MASTER);
  assert.ok(encrypted.startsWith("v1."));
  assert.equal(encrypted.includes(plaintext), false);
  assert.equal(decryptProviderApiKey(encrypted, MASTER), plaintext);
  assert.equal(providerApiKeyHint(plaintext), "••••alue");
});

test("rejects decryption with a different master secret", () => {
  const encrypted = encryptProviderApiKey("sk-provider-secret-value", MASTER);
  assert.throws(() => decryptProviderApiKey(encrypted, "different-generation-provider-master-secret-123456"));
});
