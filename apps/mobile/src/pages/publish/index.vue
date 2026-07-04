<script setup lang="ts">
import { computed, ref } from "vue";
import { draftWorks, workTags, type DraftWork } from "./publishData";

const selectedDraft = ref<DraftWork | null>(null);
const title = ref("");
const desc = ref("");
const selectedTags = ref<string[]>([]);
const pickerOpen = ref(false);

const titleCount = computed(() => `${title.value.length}/30`);
const descCount = computed(() => `${desc.value.length}/200`);

function openPicker() {
  pickerOpen.value = true;
}

function closePicker() {
  pickerOpen.value = false;
}

function selectDraft(draft: DraftWork) {
  selectedDraft.value = draft;
  if (!title.value) title.value = draft.title;
  closePicker();
}

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
  if (!selectedDraft.value) {
    uni.showToast({ title: "请选择要发布的作品", icon: "none" });
    return;
  }
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入作品标题", icon: "none" });
    return;
  }
  uni.showToast({ title: `作品「${title.value.trim()}」发布成功！`, icon: "none" });
  setTimeout(() => uni.navigateBack(), 800);
}
</script>

<template>
  <view class="publish-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="publish-content">
        <view class="field">
          <view class="field-title">选择作品</view>
          <view class="draft-card" @click="openPicker">
            <template v-if="!selectedDraft">
              <view class="draft-empty-icon">＋</view>
              <view class="draft-empty-text">
                <view class="draft-empty-title">从草稿箱选择</view>
                <view class="draft-empty-sub">点击浏览全部草稿作品</view>
              </view>
            </template>
            <template v-else>
              <image class="draft-thumb" :src="selectedDraft.image" mode="aspectFill" />
              <view class="draft-selected-text">
                <view class="draft-selected-title">{{ selectedDraft.title }}</view>
                <view class="draft-selected-sub">{{ selectedDraft.resolution }}</view>
              </view>
            </template>
            <view class="draft-arrow">›</view>
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

        <button class="submit-btn" @click="submit">✈ 发布作品</button>
      </view>
    </scroll-view>

    <view class="sheet-overlay" :class="{ show: pickerOpen }" @click="closePicker" />
    <view class="picker-sheet" :class="{ show: pickerOpen }">
      <view class="sheet-handle" />
      <view class="picker-title">选择草稿作品</view>
      <scroll-view class="picker-scroll" scroll-y>
        <view class="picker-grid">
          <view
            v-for="draft in draftWorks"
            :key="draft.id"
            class="picker-item"
            :class="{ active: selectedDraft && selectedDraft.id === draft.id }"
            @click="selectDraft(draft)"
          >
            <image class="picker-thumb" :src="draft.image" mode="aspectFill" />
            <view class="picker-info">
              <view class="picker-name">{{ draft.title }}</view>
              <view class="picker-res">{{ draft.resolution }}</view>
            </view>
            <view v-if="selectedDraft && selectedDraft.id === draft.id" class="picker-check">✓</view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped>
.publish-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.page-scroll {
  height: 100%;
}

.publish-content {
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

.draft-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.draft-empty-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 26px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 12px;
}

.draft-empty-text {
  flex: 1;
}

.draft-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.draft-empty-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.draft-thumb {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border-radius: 12px;
}

.draft-selected-text {
  flex: 1;
  min-width: 0;
}

.draft-selected-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-selected-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.draft-arrow {
  flex: 0 0 auto;
  font-size: 20px;
  color: var(--fg-muted);
}

.input-card {
  background: var(--bg-card);
  border: 1px solid var(--card-border);
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

.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  visibility: hidden;
  background: rgba(0, 0, 0, 0.36);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sheet-overlay.show {
  visibility: visible;
  opacity: 1;
}

.picker-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 310;
  padding: 8px 20px 20px;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 30px rgba(14, 31, 58, 0.12);
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.picker-sheet.show {
  transform: translateY(0);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 16px;
  background: rgba(91, 159, 232, 0.32);
  border-radius: 999px;
}

.picker-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.picker-scroll {
  max-height: 60vh;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.picker-item {
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
}

.picker-item.active {
  border-color: var(--accent);
}

.picker-thumb {
  display: block;
  width: 100%;
  height: 96px;
}

.picker-info {
  padding: 6px 8px;
  background: var(--bg-elevated);
}

.picker-name {
  overflow: hidden;
  font-size: 11px;
  color: var(--fg-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-res {
  margin-top: 2px;
  font-size: 10px;
  color: var(--fg-muted);
}

.picker-check {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 14px;
  color: #fff;
  background: var(--accent);
  border-radius: 50%;
}
</style>
