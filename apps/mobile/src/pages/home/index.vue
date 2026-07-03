<script setup lang="ts">
import { mockModels, mockUser } from "@lumi-draw/shared";
import { onMounted } from "vue";
import { initDataMode, useDataMode } from "../../services/dataMode";

const { useMockData, setUseMockData } = useDataMode();

onMounted(() => {
  initDataMode();
});
</script>

<template>
  <view class="page">
    <view class="title">露米绘画AI</view>
    <view class="sub">小程序前端基础框架已就绪</view>
    <view class="panel">
      <view>当前用户：{{ mockUser.nickname }}</view>
      <view>可用模型：{{ mockModels.length }} 个</view>
      <view>数据模式：{{ useMockData ? "模拟数据" : "真实接口" }}</view>
    </view>
    <button class="mode-btn" @click="setUseMockData(!useMockData)">
      切换模拟数据
    </button>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 48rpx 32rpx;
  background: #f7f8fb;
  color: #1f2937;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
}

.sub {
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 26rpx;
}

.panel {
  margin-top: 32rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #ffffff;
  line-height: 1.8;
  font-size: 28rpx;
}

.mode-btn {
  margin-top: 28rpx;
}
</style>
