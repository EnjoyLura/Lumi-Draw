import assert from "node:assert/strict";
import { generateKeyPairSync, createSign } from "node:crypto";
import test from "node:test";
import { isWechatPayConfigured, WechatPayClient, type WechatPayConfig } from "./wechat-pay.client";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const publicKeyId = "PUB_KEY_ID_TEST";

function config(overrides: Partial<WechatPayConfig> = {}): WechatPayConfig {
  return {
    appId: "wx-test",
    mchId: "1900000001",
    apiBase: "https://api.mch.weixin.qq.com",
    apiV3Key: "01234567890123456789012345678901",
    certSerialNo: "MERCHANT_CERT_SERIAL",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    platformCertificate: "",
    publicKey: publicKeyPem,
    publicKeyId,
    notifyUrl: "https://example.com/api/payments/wechat/notify",
    ...overrides
  };
}

function signedHeaders(body: string, serial = publicKeyId) {
  const timestamp = "1722850421";
  const nonce = "test-nonce";
  const signature = createSign("RSA-SHA256")
    .update(`${timestamp}\n${nonce}\n${body}\n`)
    .sign(privateKey, "base64");
  return { timestamp, nonce, signature, serial };
}

test("public key mode requires a public key id", () => {
  assert.equal(isWechatPayConfigured(config()), true);
  assert.equal(isWechatPayConfigured(config({ publicKeyId: "" })), false);
});

test("public key mode verifies a signed callback", () => {
  const client = new WechatPayClient(config());
  const body = '{"event_type":"TRANSACTION.SUCCESS"}';
  assert.equal(client.verifyNotify(signedHeaders(body), body), true);
});

test("public key mode rejects a mismatched key id or modified body", () => {
  const client = new WechatPayClient(config());
  const body = '{"event_type":"TRANSACTION.SUCCESS"}';
  assert.equal(client.verifyNotify(signedHeaders(body, "PUB_KEY_ID_OTHER"), body), false);
  assert.equal(client.verifyNotify(signedHeaders(body), `${body} `), false);
});
