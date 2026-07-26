import { requireWechatPrivacyAuthorization } from "./wechatPrivacy";

class ClipboardError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ClipboardError";
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "errMsg" in error) return String((error as { errMsg?: unknown }).errMsg || "");
  return String(error || "");
}

export async function copyToClipboard(text: string) {
  const data = text.trim();
  if (!data) throw new ClipboardError("没有可复制的内容");

  // 微信会把剪贴板接口纳入隐私授权校验。必须在用户点击复制的
  // 同一调用链中主动请求授权，才能由微信展示官方隐私保护指引。
  await requireWechatPrivacyAuthorization();

  await new Promise<void>((resolve, reject) => {
    uni.setClipboardData({
      data,
      success: () => resolve(),
      fail: (error) => reject(new ClipboardError(errorMessage(error) || "剪贴板调用失败", error))
    });
  });
}

export function clipboardFailureMessage(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  if (/没有可复制/.test(message)) return "没有可复制的内容";
  if (/not declared|scope is not declared/.test(message)) {
    return "剪切板功能尚未在隐私保护指引中声明";
  }
  if (/privacy|隐私|scope/.test(message)) return "请先同意隐私保护指引后再复制";
  if (/deny|denied|auth|permission|拒绝/.test(message)) return "未获得剪贴板权限，请稍后重试";
  return "复制失败，请稍后重试";
}
