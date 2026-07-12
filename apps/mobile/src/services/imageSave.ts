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
        else reject(new Error("download failed"));
      },
      fail: reject
    });
  });
}

function saveImageToAlbum(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    uni.saveImageToPhotosAlbum({ filePath, success: () => resolve(), fail: reject });
  });
}

export async function saveImageToDevice(url: string, filename = `lumi-${Date.now()}.jpg`) {
  if (saveImageInBrowser(url, filename)) return;
  const filePath = await downloadImage(url);
  await saveImageToAlbum(filePath);
}
