<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import {
  countOptions,
  createModels,
  createStyles,
  gameplayTemplates,
  qualityOptions,
  ratioOptions
} from "./createData";

const selectedGameplayName = ref("");
const selectedModelIndex = ref(0);
const selectedStyleName = ref("");
const selectedQualityIndex = ref(0);
const selectedRatioIndex = ref(0);
const selectedCountIndex = ref(0);
const promptText = ref("");
const promptImage = ref("");
const isGenerating = ref(false);
const modelDrawerOpen = ref(false);
const progress = ref(0);
const stageText = ref("点击「开始创作」生成作品");
const generatedSeeds = ref<string[]>([]);

let progressTimer: ReturnType<typeof setInterval> | undefined;
let finishTimer: ReturnType<typeof setTimeout> | undefined;

const selectedModel = computed(() => createModels[selectedModelIndex.value]);
const selectedGameplay = computed(() => {
  return gameplayTemplates.find((item) => item.name === selectedGameplayName.value);
});
const selectedQuality = computed(() => qualityOptions[selectedQualityIndex.value]);
const selectedRatio = computed(() => ratioOptions[selectedRatioIndex.value]);
const selectedCount = computed(() => countOptions[selectedCountIndex.value]);
const totalCost = computed(() => selectedModel.value.cost * selectedCount.value);
const visibleStyles = computed(() => createStyles.slice(0, 7));
const moreStyleSelected = computed(() => {
  return !!selectedStyleName.value && createStyles.findIndex((style) => style.name === selectedStyleName.value) > 6;
});

const generationStages = [
  "解析提示词，理解创作意图...",
  "构建画面构图，分配元素位置...",
  "AI深度绘制中，生成主体内容...",
  "精修细节，优化光影与色彩...",
  "高清渲染输出，即将完成..."
];

onLoad((query) => {
  const gameplay = typeof query?.gameplay === "string" ? decodeURIComponent(query.gameplay) : "";
  if (gameplayTemplates.some((item) => item.name === gameplay)) {
    selectedGameplayName.value = gameplay;
  }

  const model = typeof query?.model === "string" ? decodeURIComponent(query.model) : "";
  applySelectedModel(model);

  const prompt = typeof query?.prompt === "string" ? decodeURIComponent(query.prompt) : "";
  if (prompt) promptText.value = prompt.slice(0, 500);
});

onShow(() => {
  const promptDraft = uni.getStorageSync("lumiCreatePromptDraft");
  if (typeof promptDraft === "string" && promptDraft.trim()) {
    promptText.value = promptDraft.slice(0, 500);
    uni.removeStorageSync("lumiCreatePromptDraft");
  }

});

onBeforeUnmount(() => {
  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);
});

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

function chooseGameplay() {
  const nextIndex = selectedGameplay.value
    ? (gameplayTemplates.findIndex((item) => item.name === selectedGameplayName.value) + 1) % gameplayTemplates.length
    : 0;
  selectedGameplayName.value = gameplayTemplates[nextIndex].name;
  showToast(`已套用「${selectedGameplayName.value}」模板`);
}

function clearGameplay(event?: Event) {
  event?.stopPropagation();
  selectedGameplayName.value = "";
  showToast("已取消玩法模板");
}

function applySelectedModel(modelId: string) {
  const index = createModels.findIndex((model) => model.id === modelId || model.name === modelId);
  if (index >= 0) selectedModelIndex.value = index;
}

function openModelDrawer() {
  modelDrawerOpen.value = true;
}

function closeModelDrawer() {
  modelDrawerOpen.value = false;
}

function selectModel(index: number) {
  selectedModelIndex.value = index;
  closeModelDrawer();
  showToast(`已选择${selectedModel.value.name}`);
}

function goReversePrompt() {
  uni.navigateTo({
    url: "/pages/reverse-prompt/index"
  });
}

function selectStyle(name: string) {
  selectedStyleName.value = name;
}

function selectMoreStyle() {
  const moreStyles = createStyles.slice(7, -1);
  const currentIndex = moreStyles.findIndex((style) => style.name === selectedStyleName.value);
  const nextStyle = moreStyles[(currentIndex + 1) % moreStyles.length];
  selectedStyleName.value = nextStyle.name;
  showToast(`已选择${nextStyle.name}`);
}

function uploadPromptImage() {
  promptImage.value = `https://picsum.photos/seed/upload${Date.now()}/200/200`;
  showToast("图片已上传");
}

function removePromptImage(event?: Event) {
  event?.stopPropagation();
  promptImage.value = "";
}

function clearPrompt() {
  promptText.value = "";
}

function ratioShapeStyle(width: number, height: number) {
  if (width === height) return { width: "28px", height: "28px" };
  if (width > height) return { width: "36px", height: "20px" };
  return { width: "20px", height: "36px" };
}

function startGenerate() {
  const prompt = promptText.value.trim();
  if (!prompt) {
    showToast("请输入提示词");
    return;
  }

  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);

  isGenerating.value = true;
  progress.value = 0;
  generatedSeeds.value = [];
  stageText.value = generationStages[0];
  showToast(`创作任务已提交，正在生成 ${selectedCount.value} 张图片`);

  progressTimer = setInterval(() => {
    progress.value = Math.min(progress.value + 11, 95);
    const stageIndex = Math.min(Math.floor(progress.value / 22), generationStages.length - 1);
    stageText.value = generationStages[stageIndex];
  }, 420);

  finishTimer = setTimeout(() => {
    if (progressTimer) clearInterval(progressTimer);
    progress.value = 100;
    stageText.value = "生成完成！";
    generatedSeeds.value = Array.from({ length: selectedCount.value }, (_, index) => `gen-${Date.now()}-${index}`);
    isGenerating.value = false;
  }, 3600);
}
</script>

<template>
  <view class="create-page">
    <scroll-view class="create-scroll" scroll-y>
      <view class="create-content">
        <view class="gameplay-wrap">
          <view v-if="selectedGameplay" class="gameplay-card selected" @click="chooseGameplay">
            <image class="gameplay-thumb" :src="selectedGameplay.image" mode="aspectFill" />
            <view class="gameplay-info">
              <text class="gameplay-title">{{ selectedGameplay.name }}</text>
              <text class="gameplay-meta">♨ {{ selectedGameplay.uses }}人用过</text>
            </view>
            <view class="gameplay-clear" @click="clearGameplay">×</view>
            <text class="chevron">›</text>
          </view>
          <view v-else class="gameplay-card empty" @click="chooseGameplay">
            <view class="gameplay-icon">⌘</view>
            <view class="gameplay-info">
              <text class="gameplay-title muted">选择玩法模板</text>
              <text class="gameplay-meta">一键应用热门玩法的参数配置</text>
            </view>
            <text class="chevron">›</text>
          </view>
        </view>

        <view class="section">
          <view class="section-title">选择模型</view>
          <view class="model-card" @click="openModelDrawer">
            <image class="model-img" :src="selectedModel.image" mode="aspectFill" />
            <view class="model-main">
              <view class="model-name-row">
                <text class="model-name">{{ selectedModel.name }}</text>
                <text v-if="selectedModel.badge" class="model-badge" :style="{ color: selectedModel.badgeColor }">
                  {{ selectedModel.badge }}
                </text>
              </view>
              <text class="model-desc">{{ selectedModel.description }}</text>
              <view class="tag-row">
                <text v-for="tag in selectedModel.tags" :key="tag" class="tag">{{ tag }}</text>
              </view>
            </view>
            <view class="model-cost">
              <text class="cost-num">{{ selectedModel.cost }}</text>
              <text class="cost-unit">积分起</text>
            </view>
            <text class="chevron">›</text>
          </view>
        </view>

        <view class="section">
          <view class="section-title">描述画面</view>
          <view class="prompt-box">
            <textarea
              v-model="promptText"
              class="prompt-input"
              maxlength="500"
              placeholder="描述你想要生成的图片，越详细效果越好..."
            />
            <text class="prompt-count">{{ promptText.length }}/500</text>
          </view>
          <view class="prompt-actions">
            <view class="prompt-action lavender" @click="goReversePrompt">反推提示词</view>
            <view class="prompt-action accent" @click="uploadPromptImage">上传图片</view>
            <view class="action-spacer" />
            <view v-if="promptText" class="prompt-action neutral" @click="clearPrompt">清除</view>
          </view>
          <view v-if="promptImage" class="prompt-preview" @click="showToast('图片预览将在后续补齐')">
            <image class="prompt-preview-img" :src="promptImage" mode="aspectFill" />
            <view class="prompt-remove" @click="removePromptImage">×</view>
          </view>
        </view>

        <view class="section">
          <view class="section-title">风格类型</view>
          <view class="style-grid">
            <view
              v-for="style in visibleStyles"
              :key="style.name"
              class="style-card"
              :class="{ selected: selectedStyleName === style.name }"
              @click="selectStyle(style.name)"
            >
              <image class="style-img" :src="style.image" mode="aspectFill" />
              <view class="style-overlay" />
              <text class="style-label">{{ style.name }}</text>
            </view>
            <view class="style-card" :class="{ selected: moreStyleSelected }" @click="selectMoreStyle">
              <image class="style-img" :src="createStyles[7].image" mode="aspectFill" />
              <view class="style-overlay strong" />
              <text class="style-more">+8</text>
              <text class="style-label">更多</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-title">图片精度</view>
          <view class="quality-grid">
            <view
              v-for="(quality, index) in qualityOptions"
              :key="quality.label"
              class="option-card"
              :class="{ selected: selectedQualityIndex === index }"
              @click="selectedQualityIndex = index"
            >
              <text class="option-icon">{{ quality.icon }}</text>
              <text class="option-name">{{ quality.label }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-title with-more">
            <text>画面比例</text>
            <text class="more-link" @click="showToast('全部尺寸将在后续二级界面迁移')">全部尺寸 ›</text>
          </view>
          <view class="ratio-grid">
            <view
              v-for="(ratio, index) in ratioOptions"
              :key="ratio.label"
              class="ratio-card"
              :class="{ selected: selectedRatioIndex === index }"
              @click="selectedRatioIndex = index"
            >
              <view class="ratio-shape" :style="ratioShapeStyle(ratio.width, ratio.height)" />
              <text class="ratio-name">{{ ratio.label }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-title">生成数量</view>
          <view class="count-row">
            <view
              v-for="(count, index) in countOptions"
              :key="count"
              class="count-card"
              :class="{ selected: selectedCountIndex === index }"
              @click="selectedCountIndex = index"
            >
              {{ count }}张
            </view>
          </view>
        </view>

        <view class="section result-section">
          <view class="section-title">生成结果</view>
          <view v-if="isGenerating" class="generating-card">
            <view class="progress-ring" :style="{ background: `conic-gradient(var(--accent) ${progress}%, var(--border) 0)` }">
              <view class="progress-num">{{ progress }}%</view>
            </view>
            <text class="stage-text">{{ stageText }}</text>
            <view class="progress-track">
              <view class="progress-bar" :style="{ width: `${progress}%` }" />
            </view>
            <text class="generation-meta">
              消耗 {{ totalCost }} 积分 · 使用 {{ selectedModel.name }} · {{ selectedQuality.description }}
            </text>
          </view>
          <view v-else-if="generatedSeeds.length" class="result-grid">
            <view v-for="seed in generatedSeeds" :key="seed" class="result-img">
              <image :src="`https://picsum.photos/seed/${seed}/400/400`" mode="aspectFill" />
            </view>
          </view>
          <view v-else class="empty-result">
            <text class="empty-icon">□</text>
            <text>点击「开始创作」生成作品</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="create-bottom">
      <view class="cost-wrap">
        <text class="bottom-cost">{{ totalCost }}</text>
        <text class="bottom-unit">积分</text>
      </view>
      <button class="create-btn" @click="startGenerate">✦ 开始创作</button>
      <text class="bottom-note">内容由AI生成，仅供参考</text>
    </view>
    <view class="model-overlay" :class="{ show: modelDrawerOpen }" @click="closeModelDrawer" />
    <view class="model-sheet" :class="{ show: modelDrawerOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title-row">
        <view>
          <view class="sheet-title">选择模型</view>
          <view class="sheet-count">共 {{ createModels.length }} 款模型可选</view>
        </view>
        <view class="sheet-close" @click="closeModelDrawer">×</view>
      </view>
      <scroll-view class="model-drawer-scroll" scroll-y>
        <view class="model-drawer-list">
          <view
            v-for="(model, index) in createModels"
            :key="model.id"
            class="model-drawer-card"
            :class="{ selected: selectedModelIndex === index }"
            @click="selectModel(index)"
          >
            <image class="drawer-model-img" :src="model.image" mode="aspectFill" />
            <view class="drawer-model-main">
              <view class="drawer-model-name-row">
                <text class="drawer-model-name">{{ model.name }}</text>
                <text v-if="model.badge" class="drawer-model-badge" :style="{ color: model.badgeColor }">
                  {{ model.badge }}
                </text>
              </view>
              <view class="drawer-model-desc">{{ model.description }}</view>
              <view class="drawer-tag-row">
                <text v-for="tag in model.tags" :key="tag" class="drawer-tag">{{ tag }}</text>
              </view>
            </view>
            <view class="drawer-model-cost">
              <text class="drawer-cost-num">{{ model.cost }}</text>
              <text class="drawer-cost-unit">积分起</text>
            </view>
            <view v-if="selectedModelIndex === index" class="drawer-selected-icon">✓</view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped>
.create-page {
  position: relative;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: linear-gradient(175deg, var(--bg-base) 0%, var(--bg-soft) 100%);
}

.create-scroll {
  position: absolute;
  inset: 0 0 104px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.create-scroll::-webkit-scrollbar,
.create-scroll :deep(.uni-scroll-view::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.create-scroll :deep(.uni-scroll-view) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.create-content {
  padding: 10px 0 14px;
}

.gameplay-wrap,
.section {
  padding: 0 16px;
  margin-bottom: 12px;
}

.section-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
}

.section-title.with-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.more-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.gameplay-card,
.model-card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
}

.gameplay-card.empty {
  border-style: dashed;
  border-color: var(--border-strong);
}

.gameplay-card.selected {
  background: linear-gradient(180deg, rgba(91, 159, 232, 0.06) 0%, transparent 100%);
  border-color: var(--accent);
}

.gameplay-icon,
.gameplay-thumb {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 10px;
}

.gameplay-info,
.model-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.gameplay-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg-primary);
}

.gameplay-title.muted {
  font-weight: 600;
  color: var(--fg-secondary);
}

.gameplay-meta,
.model-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--fg-muted);
}

.gameplay-clear {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--fg-muted);
  background: var(--bg-soft);
  border-radius: 50%;
}

.chevron {
  flex: 0 0 auto;
  font-size: 20px;
  color: var(--fg-muted);
}

.model-card {
  gap: 12px;
  padding: 12px;
}

.model-img {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 12px;
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

.tag-row {
  display: flex;
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
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
}

.cost-unit {
  font-size: 10px;
  color: var(--fg-muted);
}

.prompt-box {
  position: relative;
}

.prompt-input {
  width: 100%;
  min-height: 150px;
  padding: 12px 12px 28px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  color: var(--fg-primary);
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.prompt-count {
  position: absolute;
  right: 12px;
  bottom: 10px;
  font-size: 11px;
  color: var(--fg-muted);
}

.prompt-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.prompt-action {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
}

.prompt-action.lavender {
  color: var(--lavender);
  background: var(--lavender-soft);
}

.prompt-action.accent {
  color: var(--accent);
  background: var(--accent-soft);
}

.prompt-action.neutral {
  color: var(--fg-muted);
  background: var(--bg-soft);
}

.action-spacer {
  flex: 1;
}

.prompt-preview {
  position: relative;
  width: 80px;
  height: 80px;
  margin-top: 8px;
}

.prompt-preview-img {
  width: 80px;
  height: 80px;
  border-radius: 10px;
}

.prompt-remove {
  position: absolute;
  top: -6px;
  left: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 14px;
  color: #fff;
  background: var(--fg-muted);
  border-radius: 50%;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.style-card {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 6px;
}

.style-card.selected {
  border-color: var(--accent);
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.28);
}

.style-img {
  width: 100%;
  height: 100%;
}

.style-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.62), transparent 54%);
}

.style-overlay.strong {
  background: rgba(0, 0, 0, 0.48);
}

.style-label {
  position: absolute;
  right: 0;
  bottom: 6px;
  left: 0;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-align: center;
}

.style-more {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.quality-grid,
.ratio-grid {
  display: grid;
  gap: 8px;
}

.quality-grid {
  grid-template-columns: repeat(3, 1fr);
}

.ratio-grid {
  grid-template-columns: repeat(5, 1fr);
}

.option-card,
.ratio-card,
.count-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  color: var(--fg-secondary);
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 7px;
}

.option-card.selected,
.ratio-card.selected,
.count-card.selected {
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.option-icon {
  font-size: 14px;
  font-weight: 700;
}

.option-name,
.ratio-name {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
}

.ratio-shape {
  background: var(--fg-muted);
  border-radius: 3px;
  opacity: 0.6;
}

.ratio-card.selected .ratio-shape {
  background: var(--accent);
  opacity: 1;
}

.count-row {
  display: flex;
  gap: 8px;
}

.count-card {
  flex: 1;
  min-height: 48px;
  font-size: 12px;
  font-weight: 600;
}

.result-section {
  margin-bottom: 0;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  font-size: 13px;
  color: var(--fg-muted);
}

.empty-icon {
  margin-bottom: 8px;
  font-size: 32px;
  color: var(--border-strong);
}

.generating-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  padding: 24px 16px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 14px;
}

.progress-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: conic-gradient(var(--accent) calc(var(--progress, 0) * 1%), var(--border) 0);
  border-radius: 50%;
}

.progress-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  background: var(--bg-card);
  border-radius: 50%;
}

.stage-text {
  font-size: 14px;
  font-weight: 600;
}

.progress-track {
  width: 100%;
  height: 4px;
  overflow: hidden;
  background: var(--border);
  border-radius: 2px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border-radius: 2px;
  transition: width 0.35s ease;
}

.generation-meta {
  font-size: 12px;
  color: var(--fg-muted);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.result-img {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 7px;
}

.result-img image {
  width: 100%;
  height: 100%;
}

.create-bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px 16px 14px;
  background: var(--bg-glass);
  border-top: 0.5px solid var(--border);
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
  backdrop-filter: blur(20px) saturate(180%);
}

.cost-wrap {
  display: flex;
  gap: 4px;
  align-items: baseline;
  white-space: nowrap;
}

.bottom-cost {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.bottom-unit {
  font-size: 12px;
  color: var(--fg-muted);
}

.create-btn {
  height: 44px;
  border: none;
  border-radius: 12px;
}

.create-btn {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
}

.bottom-note {
  grid-column: 1 / -1;
  margin-top: -6px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: center;
}

.model-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  background: rgba(15, 31, 58, 0);
  opacity: 0;
  transition: opacity 0.28s ease, background 0.28s ease;
}

.model-overlay.show {
  pointer-events: auto;
  background: rgba(15, 31, 58, 0.38);
  opacity: 1;
}

.model-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 90;
  max-height: 76vh;
  padding: 8px 16px calc(18px + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -10px 30px rgba(60, 120, 200, 0.16);
  transform: translateY(105%);
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
}

.model-sheet.show {
  transform: translateY(0);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  margin: 0 auto 14px;
  background: var(--border-strong);
  border-radius: 999px;
}

.sheet-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sheet-title {
  margin-bottom: 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
}

.sheet-count {
  font-size: 12px;
  color: var(--fg-muted);
}

.sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 24px;
  color: var(--fg-muted);
  background: var(--bg-soft);
  border-radius: 50%;
}

.model-drawer-scroll {
  max-height: calc(76vh - 82px);
}

.model-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 4px;
}

.model-drawer-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.model-drawer-card:active {
  transform: scale(0.99);
}

.model-drawer-card.selected {
  background: linear-gradient(180deg, rgba(91, 159, 232, 0.06) 0%, transparent 100%);
  border-color: var(--accent);
}

.drawer-model-img {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.drawer-model-main {
  flex: 1;
  min-width: 0;
}

.drawer-model-name-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
}

.drawer-model-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-model-badge {
  flex: 0 0 auto;
  padding: 1px 4px;
  margin-left: 4px;
  font-size: 8px;
  font-weight: 600;
  line-height: 1;
  background: rgba(91, 159, 232, 0.12);
  border-radius: 3px;
  transform: translateY(-6px);
}

.drawer-model-desc {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.drawer-tag {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-radius: 999px;
}

.drawer-model-cost {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: baseline;
}

.drawer-cost-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
}

.drawer-cost-unit {
  font-size: 10px;
  color: var(--fg-muted);
}

.drawer-selected-icon {
  flex: 0 0 auto;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}
</style>
