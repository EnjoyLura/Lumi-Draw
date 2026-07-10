import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiBase: string;
  apiV3Key: string;
  certSerialNo: string;
  privateKey: string;
  platformCertificate: string;
  publicKey: string;
  publicKeyId: string;
  notifyUrl: string;
}

export interface WechatJsapiOrderInput {
  description: string;
  outTradeNo: string;
  amountFen: number;
  openId: string;
  attach?: string;
}

export interface WechatPaymentParams {
  provider: "wechat";
  configured: true;
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
}

export interface WechatNotifyHeaders {
  timestamp?: string;
  nonce?: string;
  signature?: string;
  serial?: string;
}

export interface WechatTransaction {
  out_trade_no: string;
  transaction_id?: string;
  trade_state?: string;
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

export function loadPem(inline?: string, filePath?: string) {
  if (inline?.trim()) return normalizePem(inline);
  if (filePath?.trim()) return readFileSync(filePath.trim(), "utf8").trim();
  return "";
}

export function isWechatPayConfigured(config: WechatPayConfig) {
  const verificationConfigured = Boolean(config.platformCertificate || (config.publicKey && config.publicKeyId));
  return Boolean(
    config.appId &&
      config.mchId &&
      config.apiV3Key &&
      config.certSerialNo &&
      config.privateKey &&
      verificationConfigured &&
      config.notifyUrl
  );
}

export class WechatPayClient {
  constructor(private readonly config: WechatPayConfig) {}

  async createJsapiPayment(input: WechatJsapiOrderInput): Promise<WechatPaymentParams> {
    const body = {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: input.description.slice(0, 127),
      out_trade_no: input.outTradeNo,
      notify_url: this.config.notifyUrl,
      amount: { total: input.amountFen, currency: "CNY" },
      payer: { openid: input.openId },
      ...(input.attach ? { attach: input.attach } : {})
    };
    const payload = JSON.stringify(body);
    const path = "/v3/pay/transactions/jsapi";
    const res = await fetch(`${this.config.apiBase}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: this.authorization("POST", path, payload)
      },
      body: payload
    });
    const rawResponse = await res.text();
    const data = parseWechatResponse(rawResponse);
    if (!res.ok || !data.prepay_id) {
      throw new Error(data.message || data.code || `WeChat Pay create order failed with HTTP ${res.status}`);
    }
    if (!this.verifyResponse(res.headers, rawResponse)) {
      throw new Error("WeChat Pay response signature verification failed");
    }
    return this.buildPaymentParams(data.prepay_id);
  }

  verifyNotify(headers: WechatNotifyHeaders, rawBody: string) {
    return this.verifySignature(headers, rawBody);
  }

  decryptNotifyResource(resource: { associated_data?: string; nonce: string; ciphertext: string }): WechatTransaction {
    const encrypted = Buffer.from(resource.ciphertext, "base64");
    const authTag = encrypted.subarray(encrypted.length - 16);
    const data = encrypted.subarray(0, encrypted.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(this.config.apiV3Key, "utf8"), Buffer.from(resource.nonce, "utf8"));
    if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as WechatTransaction;
  }

  private authorization(method: string, pathWithQuery: string, body: string) {
    const nonce = randomBytes(16).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${method}\n${pathWithQuery}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);
    return [
      'WECHATPAY2-SHA256-RSA2048',
      `mchid="${this.config.mchId}"`,
      `nonce_str="${nonce}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.config.certSerialNo}"`,
      `signature="${signature}"`
    ].join(",");
  }

  private verifyResponse(headers: { get(name: string): string | null }, rawBody: string) {
    return this.verifySignature(
      {
        timestamp: headers.get("wechatpay-timestamp") ?? undefined,
        nonce: headers.get("wechatpay-nonce") ?? undefined,
        signature: headers.get("wechatpay-signature") ?? undefined,
        serial: headers.get("wechatpay-serial") ?? undefined
      },
      rawBody
    );
  }

  private verifySignature(headers: WechatNotifyHeaders, rawBody: string) {
    if (!headers.timestamp || !headers.nonce || !headers.signature || !headers.serial) return false;
    if (this.config.publicKey && headers.serial !== this.config.publicKeyId) return false;
    const verificationKey = this.config.publicKey || this.config.platformCertificate;
    if (!verificationKey) return false;
    const message = `${headers.timestamp}\n${headers.nonce}\n${rawBody}\n`;
    return createVerify("RSA-SHA256").update(message).verify(verificationKey, headers.signature, "base64");
  }

  private buildPaymentParams(prepayId: string): WechatPaymentParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString("hex");
    const pkg = `prepay_id=${prepayId}`;
    const paySign = this.sign(`${this.config.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`);
    return {
      provider: "wechat",
      configured: true,
      appId: this.config.appId,
      timeStamp,
      nonceStr,
      package: pkg,
      signType: "RSA",
      paySign
    };
  }

  private sign(message: string) {
    return createSign("RSA-SHA256").update(message).sign(this.config.privateKey, "base64");
  }
}

function parseWechatResponse(rawBody: string) {
  try {
    return JSON.parse(rawBody) as { prepay_id?: string; message?: string; code?: string };
  } catch {
    return {} as { prepay_id?: string; message?: string; code?: string };
  }
}
