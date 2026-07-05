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
    date: "2025-06-25",
    latest: true,
    changes: [
      { kind: "新增", text: "创作页玩法模板功能，一键套用热门玩法" },
      { kind: "新增", text: "草稿箱页面，方便管理未发布作品" },
      { kind: "优化", text: "创作页界面布局，各区块间距更紧凑" },
      { kind: "优化", text: "提示词输入区和图片精度选择体验" },
      { kind: "修复", text: "修复暗色模式下部分组件显示异常" }
    ]
  },
  {
    version: "v0.9.0",
    date: "2025-06-10",
    changes: [
      { kind: "新增", text: "广场分类筛选与排序功能" },
      { kind: "新增", text: "作品详情一键同款生成" },
      { kind: "优化", text: "瀑布流加载性能，滚动更流畅" },
      { kind: "修复", text: "修复部分机型图片上传失败问题" }
    ]
  }
];
