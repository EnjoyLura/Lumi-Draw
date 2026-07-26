import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  isWechatVirtualOrderPaid,
  WechatVirtualPayClient,
  type WechatVirtualPayConfig
} from "./wechat-virtual-pay.client";

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

test("paid virtual orders include paid, delivering, and delivered states", () => {
  assert.equal(isWechatVirtualOrderPaid(0), false);
  assert.equal(isWechatVirtualOrderPaid(1), false);
  assert.equal(isWechatVirtualOrderPaid(2), true);
  assert.equal(isWechatVirtualOrderPaid(3), true);
  assert.equal(isWechatVirtualOrderPaid(4), true);
  assert.equal(isWechatVirtualOrderPaid(5), false);
  assert.equal(isWechatVirtualOrderPaid(6), false);
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

test("server wallet APIs sign and send the exact official request bodies", async () => {
  const client = new WechatVirtualPayClient(config());
  const calls: Array<{ url: URL; body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.pathname === "/cgi-bin/stable_token") {
      return new Response(JSON.stringify({ access_token: "access-token", expires_in: 7200 }));
    }
    const body = String(init?.body ?? "");
    calls.push({ url, body });
    if (url.pathname === "/xpay/query_user_balance") {
      return new Response(JSON.stringify({ errcode: 0, balance: 480, present_balance: 80 }));
    }
    if (url.pathname === "/xpay/currency_pay") {
      return new Response(JSON.stringify({ errcode: 0, order_id: "PAY001", balance: 460 }));
    }
    if (url.pathname === "/xpay/present_currency") {
      return new Response(JSON.stringify({ errcode: 0, order_id: "GIFT001", balance: 470, present_balance: 90 }));
    }
    if (url.pathname === "/xpay/cancel_currency_pay") {
      return new Response(JSON.stringify({ errcode: 0, order_id: "REFUND001" }));
    }
    return new Response(JSON.stringify({ errcode: -1, errmsg: "unexpected request" }), { status: 500 });
  };

  try {
    await client.queryUserBalance("openid-1", "session-key", "1.2.3.4");
    await client.currencyPay({
      openId: "openid-1",
      sessionKey: "session-key",
      userIp: "1.2.3.4",
      amount: 20,
      billNo: "PAY001",
      payItem: '[{"productid":"lumi_credits","unit_price":20,"quantity":1}]',
      remark: "AI生成任务"
    });
    await client.presentCurrency({
      openId: "openid-1",
      sessionKey: "session-key",
      userIp: "1.2.3.4",
      amount: 10,
      billNo: "GIFT001",
      reason: "签到奖励"
    });
    const refunded = await client.cancelCurrencyPay({
      openId: "openid-1",
      sessionKey: "session-key",
      userIp: "1.2.3.4",
      payBillNo: "PAY001",
      refundBillNo: "REFUND001",
      amount: 20
    });

    assert.equal(refunded.balance, 480);
    assert.equal(calls.length, 5);
    assert.deepEqual(JSON.parse(calls[0].body), { openid: "openid-1", env: 0, user_ip: "1.2.3.4" });
    assert.deepEqual(JSON.parse(calls[1].body), {
      openid: "openid-1",
      env: 0,
      user_ip: "1.2.3.4",
      amount: 20,
      order_id: "PAY001",
      payitem: '[{"productid":"lumi_credits","unit_price":20,"quantity":1}]',
      remark: "AI生成任务"
    });
    assert.deepEqual(JSON.parse(calls[2].body), { openid: "openid-1", env: 0, order_id: "GIFT001", amount: 10 });
    assert.deepEqual(JSON.parse(calls[3].body), {
      openid: "openid-1",
      env: 0,
      user_ip: "1.2.3.4",
      pay_order_id: "PAY001",
      order_id: "REFUND001",
      amount: 20
    });

    for (const call of [calls[0], calls[1], calls[2], calls[3], calls[4]]) {
      assert.equal(call.url.searchParams.get("pay_sig"), hmac("virtual-app-key", `${call.url.pathname}&${call.body}`));
      assert.equal(call.url.searchParams.get("signature"), hmac("session-key", call.body));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("server wallet refreshes an invalid access token once with stable_token", async () => {
  const client = new WechatVirtualPayClient(config());
  const tokenRequests: Array<{ force_refresh?: boolean }> = [];
  let balanceRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.pathname === "/cgi-bin/stable_token") {
      tokenRequests.push(JSON.parse(String(init?.body || "{}")) as { force_refresh?: boolean });
      return new Response(JSON.stringify({ access_token: `access-token-${tokenRequests.length}`, expires_in: 7200 }));
    }
    if (url.pathname === "/xpay/query_user_balance") {
      balanceRequests += 1;
      if (balanceRequests === 1) {
        return new Response(JSON.stringify({ errcode: 40014, errmsg: "access_token is invalid or not latest" }));
      }
      return new Response(JSON.stringify({ errcode: 0, balance: 120, present_balance: 20 }));
    }
    return new Response(JSON.stringify({ errcode: -1 }), { status: 500 });
  };

  try {
    const balance = await client.queryUserBalance("openid-1", "session-key", "1.2.3.4");
    assert.deepEqual(balance, { balance: 120, presentBalance: 20 });
    assert.equal(balanceRequests, 2);
    assert.deepEqual(tokenRequests.map((item) => item.force_refresh), [false, true]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("order query refreshes an invalid access token once", async () => {
  const client = new WechatVirtualPayClient(config());
  const tokenRequests: Array<{ force_refresh?: boolean }> = [];
  let orderRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.pathname === "/cgi-bin/stable_token") {
      tokenRequests.push(JSON.parse(String(init?.body || "{}")) as { force_refresh?: boolean });
      return new Response(JSON.stringify({ access_token: `access-token-${tokenRequests.length}`, expires_in: 7200 }));
    }
    if (url.pathname === "/xpay/query_order") {
      orderRequests += 1;
      if (orderRequests === 1) {
        return new Response(JSON.stringify({ errcode: 40014, errmsg: "access_token is invalid or not latest" }));
      }
      return new Response(
        JSON.stringify({
          errcode: 0,
          order: { status: 3, order_fee: 600, paid_fee: 600, wxpay_order_id: "wx-order-id" }
        })
      );
    }
    return new Response(JSON.stringify({ errcode: -1 }), { status: 500 });
  };

  try {
    const order = await client.queryOrder("openid-1", "R20260725000001");
    assert.equal(order?.status, 3);
    assert.equal(orderRequests, 2);
    assert.deepEqual(tokenRequests.map((item) => item.force_refresh), [false, true]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
