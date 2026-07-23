import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { WechatVirtualPayClient, type WechatVirtualPayConfig } from "./wechat-virtual-pay.client";

function config(overrides: Partial<WechatVirtualPayConfig> = {}): WechatVirtualPayConfig {
  return {
    appId: "wx-test",
    appSecret: "app-secret",
    offerId: "offer-test",
    appKey: "virtual-app-key",
    env: 0,
    apiBase: "https://api.weixin.qq.com",
    ...overrides
  };
}

function hmac(key: string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

test("virtual payment is configured only when all signing values exist", () => {
  assert.equal(new WechatVirtualPayClient(config()).configured, true);
  assert.equal(new WechatVirtualPayClient(config({ offerId: "" })).configured, false);
  assert.equal(new WechatVirtualPayClient(config({ appKey: "" })).configured, false);
});

test("coin payment signs the exact serialized payload", () => {
  const client = new WechatVirtualPayClient(config());
  const params = client.createCoinPayment({
    orderNo: "R20260724000001",
    orderId: "order-id",
    buyQuantity: 100,
    sessionKey: "session-key"
  });
  assert.equal(params.mode, "short_series_coin");
  assert.deepEqual(JSON.parse(params.signData), {
    offerId: "offer-test",
    buyQuantity: 100,
    env: 0,
    currencyType: "CNY",
    outTradeNo: "R20260724000001",
    attach: "order-id"
  });
  assert.equal(
    params.paySig,
    hmac("virtual-app-key", `requestVirtualPayment&${params.signData}`)
  );
  assert.equal(params.signature, hmac("session-key", params.signData));
});

test("membership payment includes the published product and exact price", () => {
  const client = new WechatVirtualPayClient(config());
  const params = client.createGoodsPayment({
    orderNo: "M20260724000001",
    orderId: "order-id",
    productId: "lumi_member_2",
    goodsPrice: 4800,
    sessionKey: "session-key"
  });
  assert.equal(params.mode, "short_series_goods");
  assert.deepEqual(JSON.parse(params.signData), {
    offerId: "offer-test",
    buyQuantity: 1,
    env: 0,
    currencyType: "CNY",
    productId: "lumi_member_2",
    goodsPrice: 4800,
    outTradeNo: "M20260724000001",
    attach: "order-id"
  });
});
