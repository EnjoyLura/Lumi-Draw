<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { createModels, type CreateModel } from "../create/createData";

const selectedModelId = ref(createModels[0]?.id || "");

const modelCountText = computed(() => `共 ${createModels.length} 款模型可选`);

onLoad((query) => {
  const selected = typeof query?.selected === "string" ? decodeURIComponent(query.selected) : "";
  if (createModels.some((model) => model.id === selected)) {
    selectedModelId.value = selected;
  }
});

function selectModel(model: CreateModel) {
  selectedModelId.value = model.id;
  uni.setStorageSync("lumiCreateModelId", model.id);
  uni.showToast({ title: `已选择${model.name}`, icon: "none" });
  setTimeout(() => {
    uni.navigateBack({
      fail: () => {
        uni.navigateTo({
          url: `/pages/create/index?model=${encodeURIComponent(model.id)}`
        });
      }
    });
  }, 260);
}
</script>

<template>
  <view class="model-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="page-content">
        <view class="count-text">{{ modelCountText }}</view>
        <view class="model-list">
          <view
            v-for="model in createModels"
            :key="model.id"
            class="model-card"
            :class="{ selected: selectedModelId === model.id }"
            @click="selectModel(model)"
          >
            <image class="model-img" :src="model.image" mode="aspectFill" />
            <view class="model-main">
              <view class="model-name-row">
                <text class="model-name">{{ model.name }}</text>
                <text v-if="model.badge" class="model-badge" :style="{ color: model.badgeColor }">
                  {{ model.badge }}
                </text>
              </view>
              <view class="model-desc">{{ model.description }}</view>
              <view class="tag-row">
                <text v-for="tag in model.tags" :key="tag" class="tag">{{ tag }}</text>
              </view>
            </view>
            <view class="model-cost">
              <text class="cost-num">{{ model.cost }}</text>
              <text class="cost-unit">积分起</text>
            </view>
            <view v-if="selectedModelId === model.id" class="selected-icon">✓</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.model-page {
  --bg-base: #eef4fc;
  --bg-soft: #e1ebf8;
  --bg-card: #ffffff;
  --fg-primary: #0e1f3a;
  --fg-muted: #8497b5;
  --border: rgba(91, 159, 232, 0.14);
  --accent: #5b9fe8;
  --accent-deep: #327ac8;
  --accent-soft: rgba(91, 159, 232, 0.12);
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.page-content {
  padding: 16px;
}

.count-text {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--fg-muted);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.model-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.model-card:active {
  transform: scale(0.99);
}

.model-card.selected {
  background: linear-gradient(180deg, rgba(91, 159, 232, 0.06) 0%, transparent 100%);
  border-color: var(--accent);
}

.model-img {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.model-main {
  flex: 1;
  min-width: 0;
}

.model-name-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
}

.model-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-badge {
  flex: 0 0 auto;
  padding: 1px 4px;
  margin-left: 4px;
  font-size: 8px;
  font-weight: 600;
  background: rgba(91, 159, 232, 0.12);
  border-radius: 3px;
}

.model-desc {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-radius: 999px;
}

.model-cost {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: baseline;
}

.cost-num {
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
}

.cost-unit {
  font-size: 10px;
  color: var(--fg-muted);
}

.selected-icon {
  flex: 0 0 auto;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}
</style>
