export interface SettingsLink {
  key: string;
  label: string;
  icon: string;
  color?: string;
  tag?: string;
  meta?: string;
}

export const aboutItems: SettingsLink[] = [
  { key: "agreement", label: "用户协议", icon: "▤" },
  { key: "privacy", label: "隐私政策", icon: "◷" },
  { key: "recharge-agreement", label: "充值协议", icon: "▥" },
  { key: "cache", label: "清除缓存", icon: "◎", meta: "12.5MB" },
  { key: "version", label: "当前版本", icon: "✦", meta: "v1.0.0" }
];
