export interface SettingsLink {
  key: string;
  label: string;
  icon: string;
  color?: string;
  tag?: string;
  meta?: string;
}

export const aboutItems: SettingsLink[] = [
  { key: "agreement", label: "用户协议", icon: "file-text" },
  { key: "privacy", label: "隐私政策", icon: "shield-check" },
  { key: "recharge-agreement", label: "充值协议", icon: "credit-card" },
  { key: "version", label: "当前版本", icon: "info", meta: "v1.0.0" }
];
