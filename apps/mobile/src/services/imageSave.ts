import { requireWechatPrivacyAuthorization } from "./wechatPrivacy";

type ImageSaveErrorCode = "download" | "permission" | "unsupported-format" | "storage" | "cancelled" | "save";

type WechatFileSystemManager = {
  copyFile: (options: { srcPath: string; destPath: string; success: () => void; fail: (error: unknown) => void }) => void;
  unlink: (options: { filePath: string; complete?: () => void }) => void;
};

type WechatSaveRuntime = {
  env?: { USER_DATA_PATH?: string };
  getFileSystemManager?: () => WechatFileSystemManager;
};

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

function inspectLocalImage(filePath: string) {
  return new Promise<{ path: string; type: string }>((resolve, reject) => {
    uni.getImageInfo({
      src: filePath,
      success(result) {
        const type = String((result as { type?: string }).type || "").toLowerCase();
        resolve({ path: result.path || filePath, type });
      },
      fail(error) {
        reject(new ImageSaveError("unsupported-format", "downloaded image is invalid", error));
      }
    });
  });
}

function imageExtension(type: string, url: string) {
  if (type === "jpg" || type === "jpeg") return "jpg";
  if (type === "png" || type === "webp") return type;
  const matched = url.split(/[?#]/, 1)[0]?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase();
  return matched === "jpeg" ? "jpg" : matched || "png";
}

function copyImageWithExtension(filePath: string, extension: string) {
  // #ifdef MP-WEIXIN
  const runtime = (globalThis as typeof globalThis & { wx?: WechatSaveRuntime }).wx;
  const root = runtime?.env?.USER_DATA_PATH;
  const fs = runtime?.getFileSystemManager?.();
  if (!root || !fs) return Promise.resolve({ path: filePath, cleanup: () => undefined });
  const destination = root + "/lumi-save-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extension;
  return new Promise<{ path: string; cleanup: () => void }>((resolve, reject) => {
    fs.copyFile({
      srcPath: filePath,
      destPath: destination,
      success: () => resolve({
        path: destination,
        cleanup: () => fs.unlink({ filePath: destination })
      }),
      fail: (error) => reject(new ImageSaveError("storage", "prepare local image failed", error))
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve({ path: filePath, cleanup: () => undefined });
  // #endif
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
          : /cancel/.test(message)
            ? "cancelled"
            : /space|storage|disk|no such file|not found/.test(message)
              ? "storage"
              : /invalid|format|type|webp/.test(message)
                ? "unsupported-format"
                : "save";
        reject(new ImageSaveError(code, "save image failed: " + message, error));
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
    if (error.code === "storage") return "手机存储空间不足或临时文件已失效，请清理空间后重试";
    if (error.code === "cancelled") return "已取消保存图片";
    const detail = errorMessage(error.cause).replace(/^saveimagetophotosalbum:fail\s*/i, "").slice(0, 48);
    if (detail && detail !== "undefined") return "图片保存失败：" + detail;
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
  const downloadedPath = await downloadImage(url);
  const inspected = await inspectLocalImage(downloadedPath);
  const prepared = await copyImageWithExtension(inspected.path, imageExtension(inspected.type, url));
  try {
    await saveImageToAlbumWithPermissionRecovery(prepared.path);
  } finally {
    prepared.cleanup();
  }
}
