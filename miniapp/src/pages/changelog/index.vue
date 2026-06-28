<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav"><view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view><text class="nav-title">更新日志</text><view style="width:40px;" /></view>
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollH + 'px' }">
      <view class="app-header">
        <view class="app-logo">L</view>
        <view class="app-info"><text class="app-name">Lumi-Draw</text><text class="app-version">当前版本 v1.0.0</text></view>
      </view>

      <view v-for="v in versions" :key="v.version" class="version-card">
        <view class="version-header">
          <text class="version-num">{{ v.version }}</text>
          <text v-if="v.latest" class="version-badge">最新版本</text>
        </view>
        <text class="version-date">{{ v.date }}</text>
        <view class="changelog-list">
          <view v-for="(log, i) in v.logs" :key="i" class="changelog-item">
            <text :class="['log-tag', log.type]">{{ log.label }}</text>
            <text class="log-text">{{ log.text }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const scrollH = ref(700);
const versions = [
  {
    version: 'v1.0.0', date: '2025-06-25', latest: true,
    logs: [
      { type: 'new', label: '新增', text: '创作页玩法模板功能，一键套用热门玩法' },
      { type: 'new', label: '新增', text: '草稿箱页面，方便管理未发布作品' },
      { type: 'optimize', label: '优化', text: '创作页界面布局，各区块间距更紧凑' },
      { type: 'optimize', label: '优化', text: '提示词输入区域，字数统计移至输入框内' },
      { type: 'optimize', label: '优化', text: '图片精度选择器统一为卡片风格' },
      { type: 'fix', label: '修复', text: '暗色模式下部分组件显示异常' },
    ],
  },
  {
    version: 'v0.9.0', date: '2025-06-10', latest: false,
    logs: [
      { type: 'new', label: '新增', text: '广场分类筛选与排序功能' },
      { type: 'new', label: '新增', text: '作品详情一键同款生成' },
      { type: 'optimize', label: '优化', text: '瀑布流加载性能，滚动更流畅' },
      { type: 'fix', label: '修复', text: '部分机型图片上传失败问题' },
    ],
  },
  {
    version: 'v0.8.0', date: '2025-05-20', latest: false,
    logs: [
      { type: 'new', label: '新增', text: '会员体系，月卡/季卡/年卡' },
      { type: 'new', label: '新增', text: '每日签到与连续签到里程碑奖励' },
      { type: 'optimize', label: '优化', text: '个人主页界面与画廊管理功能' },
    ],
  },
];
const goBack = () => uni.navigateBack();
onMounted(() => { scrollH.value = uni.getSystemInfoSync().windowHeight - 80; });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.page-scroll { padding-top: 90px; padding-left: 16px; padding-right: 16px; }

.app-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.app-logo { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #5B9FE8, #4ECBA0); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #fff; }
.app-name { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; }
.app-version { font-size: 13px; color: #8497B5; }

.version-card { background: #fff; border-radius: 20px; border: 1px solid rgba(91,159,232,0.14); padding: 16px; margin-bottom: 12px; }
.version-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.version-num { font-size: 16px; font-weight: 700; color: #0E1F3A; }
.version-badge { font-size: 9px; font-weight: 600; padding: 2px 8px; background: rgba(91,159,232,0.12); color: #5B9FE8; border-radius: 999px; }
.version-date { font-size: 11px; color: #8497B5; margin-bottom: 10px; display: block; }
.changelog-list { display: flex; flex-direction: column; gap: 4px; }
.changelog-item { display: flex; align-items: flex-start; gap: 8px; }
.log-tag { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 999px; flex-shrink: 0; margin-top: 2px; }
.log-tag.new { background: rgba(111,212,176,0.16); color: #6FD4B0; }
.log-tag.optimize { background: rgba(91,159,232,0.12); color: #5B9FE8; }
.log-tag.fix { background: rgba(255,181,154,0.2); color: #E07A5A; }
.log-text { font-size: 13px; color: #445876; line-height: 1.6; }
</style>
