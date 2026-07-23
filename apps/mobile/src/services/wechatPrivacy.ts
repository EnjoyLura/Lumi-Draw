type WechatPrivacyRuntime = {
  getPrivacySetting?: (options: {
    success: (result: { needAuthorization?: boolean; privacyContractName?: string }) => void;
    fail?: (error: { errMsg?: string }) => void;
  }) => void;
  requirePrivacyAuthorize?: (options: {
    success: () => void;
    fail: (error: { errMsg?: string }) => void;
  }) => void;
  openPrivacyContract?: (options?: {
    success?: () => void;
    fail?: (error: { errMsg?: string }) => void;
  }) => void;
};

function getWechatRuntime() {
  // #ifdef MP-WEIXIN
  return (globalThis as typeof globalThis & { wx?: WechatPrivacyRuntime }).wx;
  // #endif
  return undefined;
}

export function requireWechatPrivacyAuthorization() {
  const runtime = getWechatRuntime();
  if (!runtime?.requirePrivacyAuthorize) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    runtime.requirePrivacyAuthorize?.({
      success: resolve,
      fail: (error) => reject(new Error(error.errMsg || "privacy authorization denied"))
    });
  });
}

export function openWechatPrivacyContract() {
  const runtime = getWechatRuntime();
  if (!runtime?.openPrivacyContract) {
    uni.showToast({ title: "请在微信小程序中查看隐私保护指引", icon: "none" });
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    runtime.openPrivacyContract?.({
      success: () => resolve(true),
      fail: () => {
        uni.showToast({ title: "隐私保护指引暂未配置", icon: "none" });
        resolve(false);
      }
    });
  });
}

export function getWechatPrivacySetting() {
  const runtime = getWechatRuntime();
  if (!runtime?.getPrivacySetting) return Promise.resolve({ needAuthorization: false, privacyContractName: "" });

  return new Promise<{ needAuthorization: boolean; privacyContractName: string }>((resolve) => {
    runtime.getPrivacySetting?.({
      success: (result) =>
        resolve({
          needAuthorization: Boolean(result.needAuthorization),
          privacyContractName: result.privacyContractName || ""
        }),
      fail: () => resolve({ needAuthorization: false, privacyContractName: "" })
    });
  });
}
