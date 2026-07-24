import { createHmac } from "node:crypto";

export interface WechatVirtualPayConfig {
  appId: string;
  appSecret: string;
  offerId: string;
  appKey: string;
  env: 0 | 1;
  apiBase: string;
}

export interface WechatVirtualSession {
  openId: string;
  sessionKey: string;
}

export interface WechatVirtualOrder {
  status: number;
  order_fee?: number;
  paid_fee?: number;
  wx_order_id?: string;
  wxpay_order_id?: string;
  channel_order_id?: string;
}

export interface WechatVirtualBalance {
  balance: number;
  presentBalance: number;
}

export interface WechatVirtualCurrencyResult extends WechatVirtualBalance {
  billNo: string;
}

interface WechatApiResponse {
  errcode?: number;
  errmsg?: string;
}

export class WechatVirtualPayClient {
  private accessToken = "";
  private accessTokenExpiresAt = 0;
  private accessTokenPromise?: Promise<string>;

  constructor(private readonly config: WechatVirtualPayConfig) {}

  get configured() {
    return Boolean(
      this.config.appId &&
        this.config.appSecret &&
        this.config.offerId &&
        this.config.appKey
    );
  }

  async exchangeLoginCode(code: string): Promise<WechatVirtualSession> {
    if (!this.config.appId || !this.config.appSecret) {
      throw new Error("微信登录配置不完整");
    }
    const url = new URL("/sns/jscode2session", this.config.apiBase);
    url.searchParams.set("appid", this.config.appId);
    url.searchParams.set("secret", this.config.appSecret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");
    const response = await fetch(url);
    const data = (await response.json()) as WechatApiResponse & {
      openid?: string;
      session_key?: string;
    };
    if (!response.ok || !data.openid || !data.session_key) {
      throw new Error(`微信登录凭证校验失败：${data.errmsg || data.errcode || response.status}`);
    }
    return { openId: data.openid, sessionKey: data.session_key };
  }

  createCoinPayment(input: {
    orderNo: string;
    orderId: string;
    buyQuantity: number;
    sessionKey: string;
  }) {
    return this.createPaymentParams(
      {
        offerId: this.config.offerId,
        buyQuantity: input.buyQuantity,
        env: this.config.env,
        currencyType: "CNY",
        outTradeNo: input.orderNo,
        attach: input.orderId
      },
      "short_series_coin",
      input.sessionKey
    );
  }

  createGoodsPayment(input: {
    orderNo: string;
    orderId: string;
    productId: string;
    goodsPrice: number;
    sessionKey: string;
  }) {
    return this.createPaymentParams(
      {
        offerId: this.config.offerId,
        buyQuantity: 1,
        env: this.config.env,
        currencyType: "CNY",
        productId: input.productId,
        goodsPrice: input.goodsPrice,
        outTradeNo: input.orderNo,
        attach: input.orderId
      },
      "short_series_goods",
      input.sessionKey
    );
  }

  async queryOrder(openId: string, orderNo: string): Promise<WechatVirtualOrder | null> {
    const uri = "/xpay/query_order";
    const body = JSON.stringify({
      openid: openId,
      env: this.config.env,
      order_id: orderNo
    });
    const accessToken = await this.getAccessToken();
    const url = new URL(uri, this.config.apiBase);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("pay_sig", this.paySignature(uri, body));
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body
    });
    const data = (await response.json()) as WechatApiResponse & { order?: WechatVirtualOrder };
    if (!response.ok || (data.errcode ?? 0) !== 0) {
      throw new Error(`查询虚拟支付订单失败：${data.errmsg || data.errcode || response.status}`);
    }
    return data.order ?? null;
  }

  async queryUserBalance(openId: string, sessionKey: string, userIp: string): Promise<WechatVirtualBalance> {
    const data = await this.signedRequest<{
      balance?: number;
      present_balance?: number;
    }>(
      "/xpay/query_user_balance",
      { openid: openId, env: this.config.env, user_ip: userIp },
      { sessionKey }
    );
    return {
      balance: Math.max(0, Number(data.balance ?? 0)),
      presentBalance: Math.max(0, Number(data.present_balance ?? 0))
    };
  }

  async currencyPay(input: {
    openId: string;
    sessionKey: string;
    amount: number;
    billNo: string;
    payItem: string;
    remark: string;
    userIp: string;
  }): Promise<WechatVirtualCurrencyResult> {
    const data = await this.signedRequest<{ balance?: number; order_id?: string }>(
      "/xpay/currency_pay",
      {
        openid: input.openId,
        env: this.config.env,
        user_ip: input.userIp,
        amount: input.amount,
        order_id: input.billNo,
        payitem: input.payItem,
        remark: input.remark.slice(0, 200)
      },
      { sessionKey: input.sessionKey, acceptedErrcodes: [268490004] }
    );
    if (data.balance === undefined) {
      const balance = await this.queryUserBalance(input.openId, input.sessionKey, input.userIp);
      return { ...balance, billNo: data.order_id || input.billNo };
    }
    return {
      balance: Math.max(0, Number(data.balance)),
      presentBalance: 0,
      billNo: data.order_id || input.billNo
    };
  }

  async cancelCurrencyPay(input: {
    openId: string;
    sessionKey: string;
    payBillNo: string;
    refundBillNo: string;
    amount: number;
    userIp: string;
  }): Promise<WechatVirtualCurrencyResult> {
    const data = await this.signedRequest<{ order_id?: string }>(
      "/xpay/cancel_currency_pay",
      {
        openid: input.openId,
        env: this.config.env,
        user_ip: input.userIp,
        pay_order_id: input.payBillNo,
        order_id: input.refundBillNo,
        amount: input.amount
      },
      { sessionKey: input.sessionKey, acceptedErrcodes: [268490004, 268490005] }
    );
    const balance = await this.queryUserBalance(input.openId, input.sessionKey, input.userIp);
    return { ...balance, billNo: data.order_id || input.refundBillNo };
  }

  async presentCurrency(input: {
    openId: string;
    sessionKey: string;
    userIp: string;
    amount: number;
    billNo: string;
    reason: string;
  }): Promise<WechatVirtualCurrencyResult> {
    const data = await this.signedRequest<{ balance?: number; present_balance?: number; order_id?: string }>(
      "/xpay/present_currency",
      {
        openid: input.openId,
        env: this.config.env,
        order_id: input.billNo,
        amount: input.amount
      },
      // present_currency is also a wallet mutation. WeChat requires both
      // the application pay signature and the user-session signature here.
      { sessionKey: input.sessionKey, acceptedErrcodes: [268490004] }
    );
    if (data.balance === undefined) {
      const balance = await this.queryUserBalance(input.openId, input.sessionKey, input.userIp);
      return { ...balance, billNo: data.order_id || input.billNo };
    }
    return {
      balance: Math.max(0, Number(data.balance)),
      presentBalance: Math.max(0, Number(data.present_balance ?? 0)),
      billNo: data.order_id || input.billNo
    };
  }

  async notifyGoodsProvided(orderNo: string) {
    const uri = "/xpay/notify_provide_goods";
    const body = JSON.stringify({ order_id: orderNo, env: this.config.env });
    const accessToken = await this.getAccessToken();
    const url = new URL(uri, this.config.apiBase);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("pay_sig", this.paySignature(uri, body));
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body
    });
    const data = (await response.json().catch(() => ({}))) as WechatApiResponse;
    if (!response.ok || (data.errcode ?? 0) !== 0) {
      throw new Error(`确认虚拟商品发货失败：${data.errmsg || data.errcode || response.status}`);
    }
  }

  private async signedRequest<T extends Record<string, unknown>>(
    uri: string,
    payload: Record<string, unknown>,
    options: { sessionKey?: string; acceptedErrcodes?: number[] } = {}
  ) {
    const body = JSON.stringify(payload);
    const accessToken = await this.getAccessToken();
    const url = new URL(uri, this.config.apiBase);
    url.searchParams.set("access_token", accessToken);
    if (options.sessionKey) {
      url.searchParams.set("pay_sig", this.paySignature(uri, body));
      url.searchParams.set("signature", this.hmac(options.sessionKey, body));
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body
    });
    const data = (await response.json().catch(() => ({}))) as T & WechatApiResponse;
    const errcode = data.errcode ?? 0;
    if (!response.ok || (errcode !== 0 && !options.acceptedErrcodes?.includes(errcode))) {
      throw new Error(`微信虚拟支付接口 ${uri} 调用失败：${data.errmsg || data.errcode || response.status}`);
    }
    return data;
  }

  private createPaymentParams(
    signPayload: Record<string, string | number>,
    mode: "short_series_coin" | "short_series_goods",
    sessionKey: string
  ) {
    const signData = JSON.stringify(signPayload);
    return {
      provider: "wechat_virtual" as const,
      configured: true,
      signData,
      paySig: this.paySignature("requestVirtualPayment", signData),
      signature: this.hmac(sessionKey, signData),
      mode
    };
  }

  private paySignature(uri: string, body: string) {
    return this.hmac(this.config.appKey, `${uri}&${body}`);
  }

  private hmac(key: string, value: string) {
    return createHmac("sha256", key).update(value, "utf8").digest("hex");
  }

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    if (!this.accessTokenPromise) {
      this.accessTokenPromise = (async () => {
        const url = new URL("/cgi-bin/token", this.config.apiBase);
        url.searchParams.set("grant_type", "client_credential");
        url.searchParams.set("appid", this.config.appId);
        url.searchParams.set("secret", this.config.appSecret);
        const response = await fetch(url);
        const data = (await response.json()) as WechatApiResponse & {
          access_token?: string;
          expires_in?: number;
        };
        if (!response.ok || !data.access_token) {
          throw new Error(`获取微信接口凭证失败：${data.errmsg || data.errcode || response.status}`);
        }
        this.accessToken = data.access_token;
        this.accessTokenExpiresAt =
          Date.now() + Math.max(60, (data.expires_in ?? 7200) - 300) * 1000;
        return this.accessToken;
      })().finally(() => {
        this.accessTokenPromise = undefined;
      });
    }
    return this.accessTokenPromise;
  }
}
