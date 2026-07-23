import { api } from "./api";
import { requireWechatPrivacyAuthorization } from "./wechatPrivacy";

interface UploadPolicy {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  publicUrl: string;
  ossKey: string;
  uploadToken: string;
}

export interface UploadedImage {
  ossKey: string;
  publicUrl: string;
  localPath?: string;
  width?: number;
  height?: number;
  ratio?: string;
}

export interface ChosenImage {
  path: string;
  name: string;
  contentType: string;
  sizeBytes?: number;
  file?: Blob;
  width?: number;
  height?: number;
}

const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif"
};
const GENERATION_REFERENCE_MAX_EDGE = 2048;
const GENERATION_REFERENCE_MAX_BYTES = 2 * 1024 * 1024;
const GENERATION_REFERENCE_QUALITY = 88;

function fileNameFromPath(path: string) {
  const clean = path.split("?")[0] || "";
  const name = clean.split("/").pop() || clean.split("\\").pop() || "";
  return name || `image-${Date.now()}.jpg`;
}

function contentTypeFromName(name: string, fallback = "image/jpeg") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_CONTENT_TYPE[ext] || fallback;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function ratioFromSize(width?: number, height?: number) {
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  const divisor = gcd(Math.round(width), Math.round(height));
  const rawWidth = Math.round(width) / divisor;
  const rawHeight = Math.round(height) / divisor;
  const commonRatios = [
    [1, 1],
    [3, 4],
    [4, 3],
    [2, 3],
    [3, 2],
    [9, 16],
    [16, 9]
  ];
  const target = width / height;
  const nearest = commonRatios.reduce(
    (best, item) => {
      const diff = Math.abs(item[0] / item[1] - target);
      return diff < best.diff ? { value: item, diff } : best;
    },
    { value: [rawWidth, rawHeight], diff: Number.POSITIVE_INFINITY }
  );
  return `${nearest.value[0]}:${nearest.value[1]}`;
}

function requestUploadPolicy(scene: string, filename: string, contentType: string, sizeBytes: number) {
  return api.post<UploadPolicy>("/uploads/policy", { scene, filename, contentType, sizeBytes });
}

function completeUpload(ossKey: string, uploadToken: string) {
  return api.post<UploadedImage>("/uploads/complete", { ossKey, uploadToken });
}

function chooseSingleImage(useOriginal = false): Promise<ChosenImage> {
  return requireWechatPrivacyAuthorization().then(() => new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: useOriginal ? ["original"] : ["compressed"],
      sourceType: ["album", "camera"],
      success(result) {
        const rawTempFiles = result.tempFiles;
        const tempFiles = Array.isArray(rawTempFiles) ? rawTempFiles : rawTempFiles ? [rawTempFiles] : [];
        const tempFile = tempFiles[0] as ({ path?: string; name?: string; type?: string; file?: Blob; size?: number } | string | undefined);
        const path = result.tempFilePaths?.[0] || (typeof tempFile === "object" ? tempFile.path : "") || "";
        if (!path) {
          reject(new Error("No image selected"));
          return;
        }
        const name = typeof tempFile === "object" && tempFile.name ? tempFile.name : fileNameFromPath(path);
        const contentType = typeof tempFile === "object" && tempFile.type ? tempFile.type : contentTypeFromName(name);
        const width = typeof tempFile === "object" && "width" in tempFile && typeof tempFile.width === "number" ? tempFile.width : undefined;
        const height = typeof tempFile === "object" && "height" in tempFile && typeof tempFile.height === "number" ? tempFile.height : undefined;
        resolve({
          path,
          name,
          contentType,
          file: typeof tempFile === "object" ? tempFile.file : undefined,
          sizeBytes: typeof tempFile === "object" && typeof tempFile.size === "number" ? tempFile.size : undefined,
          width,
          height
        });
      },
      fail(error) {
        reject(new Error(error.errMsg || "chooseImage failed"));
      }
    });
  }));
}

function getImageInfoByUni(path: string) {
  return new Promise<{ width: number; height: number; type?: string }>((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success(result) {
        resolve({ width: result.width, height: result.height, type: result.type });
      },
      fail(error) {
        reject(new Error(error.errMsg || "getImageInfo failed"));
      }
    });
  });
}

function getImageInfoByBrowser(path: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Image unavailable"));
      return;
    }
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error("image load failed"));
    image.src = path;
  });
}

async function resolveImageSize(image: ChosenImage) {
  if (image.width && image.height) return { width: image.width, height: image.height };
  try {
    return await getImageInfoByUni(image.path);
  } catch {
    try {
      return await getImageInfoByBrowser(image.path);
    } catch {
      return undefined;
    }
  }
}

async function blobFromPath(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Fetch image failed: ${response.status}`);
  return response.blob();
}

async function resolveUploadSize(image: Pick<ChosenImage, "path" | "file" | "sizeBytes">) {
  if (Number.isInteger(image.sizeBytes) && image.sizeBytes! > 0) return image.sizeBytes!;
  if (image.file?.size) return image.file.size;
  if (typeof fetch === "function" && /^blob:|^data:|^https?:/.test(image.path)) {
    return (await blobFromPath(image.path)).size;
  }
  throw new Error("无法读取图片大小，请重新选择图片");
}

function getLocalFileSize(path: string) {
  return new Promise<number>((resolve, reject) => {
    uni.getFileInfo({
      filePath: path,
      success: (result) => resolve(result.size),
      fail: (error) => reject(new Error(error.errMsg || "getFileInfo failed"))
    });
  });
}

function compressLocalImage(path: string, width: number, height: number) {
  return new Promise<string>((resolve, reject) => {
    uni.compressImage({
      src: path,
      quality: GENERATION_REFERENCE_QUALITY,
      compressedWidth: width,
      compressedHeight: height,
      success: (result) => resolve(result.tempFilePath),
      fail: (error) => reject(new Error(error.errMsg || "compressImage failed"))
    });
  });
}

async function optimizeGenerationReference(image: ChosenImage): Promise<ChosenImage> {
  const [size, sizeBytes] = await Promise.all([resolveImageSize(image), resolveUploadSize(image)]);
  if (!size) return image;
  const longestEdge = Math.max(size.width, size.height);
  if (longestEdge <= GENERATION_REFERENCE_MAX_EDGE && sizeBytes <= GENERATION_REFERENCE_MAX_BYTES) return image;

  const scale = Math.min(1, GENERATION_REFERENCE_MAX_EDGE / longestEdge);
  try {
    const path = await compressLocalImage(image.path, Math.round(size.width * scale), Math.round(size.height * scale));
    const optimizedInfo = await getImageInfoByUni(path);
    const optimizedSizeBytes = await getLocalFileSize(path);
    const contentType = optimizedInfo.type ? contentTypeFromName(`image.${optimizedInfo.type}`, image.contentType) : image.contentType;
    return {
      ...image,
      path,
      file: undefined,
      contentType,
      sizeBytes: optimizedSizeBytes,
      width: optimizedInfo.width,
      height: optimizedInfo.height
    };
  } catch {
    return image;
  }
}

async function putWithFetch(policy: UploadPolicy, body: Blob) {
  const response = await fetch(policy.uploadUrl, {
    method: policy.method,
    headers: policy.headers,
    body
  });
  if (!response.ok) throw new Error(`OSS upload failed: ${response.status}`);
}

function putWithUniRequest(policy: UploadPolicy, filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const fs = (uni as unknown as { getFileSystemManager?: () => { readFile: (options: unknown) => void } }).getFileSystemManager?.();
    if (!fs) {
      reject(new Error("FileSystemManager unavailable"));
      return;
    }

    fs.readFile({
      filePath,
      success(readResult: { data: ArrayBuffer }) {
        uni.request({
          url: policy.uploadUrl,
          method: policy.method as UniApp.RequestOptions["method"],
          data: readResult.data,
          header: policy.headers,
          success(response) {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve();
              return;
            }
            reject(new Error(`OSS upload failed: ${response.statusCode}`));
          },
          fail(error) {
            reject(new Error(error.errMsg || "OSS upload failed"));
          }
        });
      },
      fail(error: { errMsg?: string }) {
        reject(new Error(error.errMsg || "readFile failed"));
      }
    });
  });
}

async function putObject(policy: UploadPolicy, image: Pick<ChosenImage, "path" | "file">) {
  if (image.file) {
    await putWithFetch(policy, image.file);
    return;
  }

  if (typeof fetch === "function" && /^blob:|^data:|^https?:/.test(image.path)) {
    await putWithFetch(policy, await blobFromPath(image.path));
    return;
  }

  await putWithUniRequest(policy, image.path);
}

export async function chooseLocalImage(options?: { optimizeForGeneration?: boolean }) {
  const image = await chooseSingleImage(Boolean(options?.optimizeForGeneration));
  return options?.optimizeForGeneration ? optimizeGenerationReference(image) : image;
}

export async function uploadSelectedImage(scene: string, image: ChosenImage): Promise<UploadedImage> {
  const size = await resolveImageSize(image);
  const sizeBytes = await resolveUploadSize(image);
  const policy = await requestUploadPolicy(scene, image.name, image.contentType, sizeBytes);
  await putObject(policy, image);
  const completed = await completeUpload(policy.ossKey, policy.uploadToken);
  return { ...completed, localPath: image.path, width: size?.width, height: size?.height, ratio: ratioFromSize(size?.width, size?.height) };
}

export async function uploadChosenImage(scene: string): Promise<UploadedImage> {
  const image = await chooseLocalImage();
  return uploadSelectedImage(scene, image);
}

export async function uploadLocalImagePath(scene: string, path: string): Promise<UploadedImage> {
  const info = await getImageInfoByUni(path).catch(() => undefined);
  const imageType = info?.type?.toLowerCase() || "jpg";
  const normalizedType = imageType === "jpeg" ? "jpg" : imageType;
  const image: ChosenImage = {
    path,
    name: `avatar-${Date.now()}.${normalizedType}`,
    contentType: contentTypeFromName(`image.${normalizedType}`),
    sizeBytes: await getLocalFileSize(path),
    width: info?.width,
    height: info?.height
  };
  return uploadSelectedImage(scene, image);
}

export async function uploadRemoteImage(url: string, scene: string, filename = `image-${Date.now()}.jpg`): Promise<UploadedImage> {
  const blob = await blobFromPath(url);
  const contentType = blob.type || contentTypeFromName(filename);
  const policy = await requestUploadPolicy(scene, filename, contentType, blob.size);
  await putWithFetch(policy, blob);
  return completeUpload(policy.ossKey, policy.uploadToken);
}
