<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getWorkById } from "../work-detail/workDetailData";
import { workTags } from "../publish/publishData";

const image = ref("");
const modelName = ref("");
const info = ref("");
const title = ref("");
const desc = ref("");
const selectedTags = ref<string[]>([]);

const titleCount = computed(() => `${title.value.length}/30`);
const descCount = computed(() => `${desc.value.length}/200`);

onLoad((query) => {
  const id = Number(query?.id || 0);
  const work = getWorkById(id);
  if (!work) return;
  image.value = work.image;
  modelName.value = work.modelName;
  info.value = [work.ratio, work.styleName, work.time].filter(Boolean).join(" · ");
  title.value = work.title || "";
  desc.value = work.description || "";
  selectedTags.value = work.tags.filter((tag) => workTags.some((item) => item.name === tag));
});

function isTagSelected(name: string) {
  return selectedTags.value.includes(name);
}

function toggleTag(name: string) {
  const index = selectedTags.value.indexOf(name);
  if (index >= 0) {
    selectedTags.value.splice(index, 1);
    return;
  }
  if (selectedTags.value.length >= 5) {
    uni.showToast({ title: "最多选择5个标签", icon: "none" });
    return;
  }
  selectedTags.value.push(name);
}

function submit() {
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入作品标题", icon: "none" });
    return;
  }
  uni.showToast({ title: "作品信息已保存", icon: "none" });
  setTimeout(() => uni.navigateBack(), 600);
}
</script>

<template>
  <view class="edit-work-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="edit-content">
        <view class="field">
          <view class="field-title">作品预览</view>
          <view class="preview-card">
            <image class="preview-thumb" :src="image" mode="aspectFill" />
            <view class="preview-text">
              <view class="preview-model">{{ modelName }}</view>
              <view class="preview-info">{{ info }}</view>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-title">作品标题</view>
          <view class="input-card">
            <input class="text-input" type="text" v-model="title" :maxlength="30" placeholder="给作品起个名字" />
          </view>
          <view class="counter">{{ titleCount }}</view>
        </view>

        <view class="field">
          <view class="field-title">作品描述</view>
          <view class="input-card">
            <textarea class="text-area" v-model="desc" :maxlength="200" placeholder="介绍一下你的创作灵感吧~" />
          </view>
          <view class="counter">{{ descCount }}</view>
        </view>

        <view class="field">
          <view class="field-head">
            <view class="field-title">作品标签</view>
            <view class="field-hint">最多选5个</view>
          </view>
          <view class="tag-grid">
            <view
              v-for="tag in workTags"
              :key="tag.name"
              class="tag-chip"
              :style="
                isTagSelected(tag.name)
                  ? { background: tag.bg, color: tag.color, borderColor: tag.color, fontWeight: 600 }
                  : {}
              "
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </view>
          </view>
        </view>

        <button class="submit-btn" @click="submit">✓ 保存修改</button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.edit-work-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.edit-content {
  padding: 16px;
}

.field {
  margin-bottom: 18px;
}

.field-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.field-head .field-title {
  margin-bottom: 0;
}

.field-hint {
  font-size: 12px;
  color: var(--fg-muted);
}

.preview-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.preview-thumb {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 10px;
}

.preview-text {
  flex: 1;
  min-width: 0;
}

.preview-model {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
}

.preview-info {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.input-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.text-input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--fg-primary);
}

.text-area {
  box-sizing: border-box;
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--fg-primary);
}

.counter {
  margin-top: 4px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: right;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-secondary);
  background: var(--bg-elevated);
  border: 1.5px solid transparent;
  border-radius: 999px;
}

.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 700;
  line-height: 50px;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 12px;
}

.submit-btn::after {
  border: none;
}
</style>
