export type ChangeKind = "新增" | "优化" | "修复";

export interface ChangeEntry {
  kind: ChangeKind;
  text: string;
}

export interface VersionLog {
  version: string;
  date: string;
  latest?: boolean;
  changes: ChangeEntry[];
}

export const currentVersion = "v1.0.0";

export const versionLogs: VersionLog[] = [
  {
    version: "v1.0.0",
    date: "2026-07-24",
    latest: true,
    changes: [
      { kind: "新增", text: "AI 图片创作、图生图与多种画面比例" },
      { kind: "新增", text: "作品画廊、作品发布与创作者广场" },
      { kind: "新增", text: "积分、会员、签到和消息功能" },
      { kind: "优化", text: "图片加载、作品详情与瀑布流浏览体验" },
      { kind: "修复", text: "修复已知问题，提高使用稳定性" }
    ]
  }
];
