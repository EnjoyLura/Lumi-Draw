import { requireWechatPrivacyAuthorization } from "./wechatPrivacy";

type ImageSaveErrorCode = "download" | "permission" | "unsupported-format" | "save";

export class ImageSaveError extends Error {
  constructor(readonly code: ImageSaveErrorCode, message: string, readonly cause?: unknown) {
    super(message);
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (error && typeof error === "object") {
    const value = error as { errMsg?: unknown; message?: unknown };
    return String(value.errMsg || value.message || error).toLowerCase();
  }
  return String(error).toLowerCase();
}

function saveImageInBrowser(url: string, filename: string) {
  if (typeof document === "undefined") return false;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}

function downloadImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    uni.downloadFile({
      url,
      success(result) {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) resolve(result.tempFilePath);
        else reject(new ImageSaveError("download", `download failed (${result.statusCode})`));
      },
      fail(error) {
        reject(new ImageSaveError("download", "download failed", error));
      }
    });
  });
}

function saveImageToAlbum(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail(error) {
        const message = errorMessage(error);
        const code: ImageSaveErrorCode = /auth|authorize|permission|deny|denied/.test(message)
          ? "permission"
          : /invalid|format|type|webp/.test(message)
            ? "unsupported-format"
            : "save";
        reject(new ImageSaveError(code, "save image failed", error));
      }
    });
  });
}

function askToOpenPhotoAlbumSetting() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "需要相册权限",
      content: "开启相册权限后才能保存图片到手机。",
      confirmText: "去设置",
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false)
    });
  });
}

function openPhotoAlbumSetting() {
  return new Promise<void>((resolve, reject) => {
    uni.openSetting({
      success: () => resolve(),
      fail: (error) => reject(new ImageSaveError("permission", "open settings failed", error))
    });
  });
}

async function saveImageToAlbumWithPermissionRecovery(filePath: string) {
  try {
    await saveImageToAlbum(filePath);
  } catch (error) {
    if (!(error instanceof ImageSaveError) || error.code !== "permission") throw error;
    if (!(await askToOpenPhotoAlbumSetting())) throw error;
    await openPhotoAlbumSetting();
    await saveImageToAlbum(filePath);
  }
}

export function imageSaveFailureMessage(error: unknown) {
  if (error instanceof ImageSaveError) {
    if (error.code === "permission") return "未开启相册权限，请在设置中允许后重试";
    if (error.code === "download") return "图片下载失败，请检查网络后重试";
    if (error.code === "unsupported-format") return "当前图片格式暂不支持保存到相册";
  }
  return "图片保存失败，请稍后重试";
}

export async function saveImageToDevice(url: string, filename = `lumi-${Date.now()}.jpg`) {
  if (saveImageInBrowser(url, filename)) return;
  try {
    await requireWechatPrivacyAuthorization();
  } catch (error) {
    throw new ImageSaveError("permission", "privacy authorization denied", error);
  }
  const filePath = await downloadImage(url);
  await saveImageToAlbumWithPermissionRecovery(filePath);
}
