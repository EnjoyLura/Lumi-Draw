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
      { kind: "优化", text: "提示词输入区域，字数统计移至输入框内" },
      { kind: "优化", text: "图片精度选择器统一为卡片风格" },
      { kind: "修复", text: "暗色模式下部分组件显示异常" }
    ]
  },
  {
    version: "v0.9.0",
    date: "2025-06-10",
    changes: [
      { kind: "新增", text: "广场分类筛选与排序功能" },
      { kind: "新增", text: "作品详情一键同款生成" },
      { kind: "优化", text: "瀑布流加载性能，滚动更流畅" },
      { kind: "修复", text: "部分机型图片上传失败问题" }
    ]
  },
  {
    version: "v0.8.0",
    date: "2025-05-20",
    changes: [
      { kind: "新增", text: "会员体系，月卡/季卡/年卡" },
      { kind: "新增", text: "每日签到与连续签到里程碑奖励" },
      { kind: "优化", text: "个人主页界面与画廊管理功能" }
    ]
  }
];
