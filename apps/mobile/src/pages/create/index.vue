<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import LumiLoginSheet from "../../components/LumiLoginSheet.vue";
import { useAuth } from "../../services/auth";
import { useDataMode } from "../../services/dataMode";
import { addActiveGenerateJobId } from "../../services/generateTaskState";
import { uploadChosenImage, uploadRemoteImage } from "../../services/upload";
import {
  countOptions,
  createModels,
  createStyles,
  gameplayTemplates,
  qualityOptions,
  ratioOptions
} from "./createData";
import {
  createDraftWork,
  createGenerateJob,
  fetchCreateConfig,
  fetchGenerateJob,
  publishGenerateResult,
  type BackendGenerateJob
} from "./createService";

const { isLoggedIn, login: commitLogin, requireLogin } = useAuth();
const { useMockData } = useDataMode();
const modelOptions = ref(createModels);
const styleOptions = ref(createStyles);
const qualityList = ref(qualityOptions);
const ratioList = ref(ratioOptions);
const gameplayOptions = ref(gameplayTemplates);
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
const ratioSheetOpen = ref(false);
const gameplaySheetOpen = ref(false);
const styleSheetOpen = ref(false);
const previewSheetOpen = ref(false);
const showLoginSheet = ref(false);
const isUploadingPromptImage = ref(false);
const isSavingDrafts = ref(false);
const progress = ref(0);
const stageText = ref("点击「开始创作」生成作品");

interface GenResult {
  id: string;
  failed: boolean;
  seed: string;
  imageUrl?: string;
  resultId?: string;
  savedWorkId?: number;
  error: string;
}

const generatedResults = ref<GenResult[]>([]);
const genMeta = ref<{ time: string; resolution: string; size: string } | null>(null);
const previewData = ref<{ src: string; resolution: string; size: string; ratio: string; resultId?: string; savedWorkId?: number } | null>(null);

let progressTimer: ReturnType<typeof setInterval> | undefined;
let finishTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let lastConfigMode: boolean | null = null;
const pendingRouteOptions = ref({ model: "", ratio: "", quality: "", style: "" });

const selectedModel = computed(() => modelOptions.value[selectedModelIndex.value] ?? createModels[0]);
const selectedGameplay = computed(() => {
  return gameplayOptions.value.find((item) => item.name === selectedGameplayName.value);
});
const selectedQuality = computed(() => qualityList.value[selectedQualityIndex.value] ?? qualityOptions[0]);
const selectedRatio = computed(() => ratioList.value[selectedRatioIndex.value] ?? ratioOptions[0]);
const selectedCount = computed(() => countOptions[selectedCountIndex.value]);
const totalCost = computed(() => selectedModel.value.cost * selectedCount.value);
const visibleStyles = computed(() => styleOptions.value.slice(0, 7));
const allStyles = computed(() => styleOptions.value.slice(0, -1));
const inlineRatios = computed(() => ratioList.value);
const moreStyleSelected = computed(() => {
  return !!selectedStyleName.value && styleOptions.value.findIndex((style) => style.name === selectedStyleName.value) > 6;
});
const failCount = computed(() => generatedResults.value.filter((item) => item.failed).length);
const successCount = computed(() => generatedResults.value.filter((item) => !item.failed).length);
const refundCredits = computed(() => failCount.value * selectedModel.value.cost);

const generationStages = [
  "解析提示词，理解创作意图...",
  "构建画面构图，分配元素位置...",
  "AI深度绘制中，生成主体内容...",
  "精修细节，优化光影与色彩...",
  "高清渲染输出，即将完成..."
];

const generationErrors = [
  "模型服务暂时不可用",
  "GPU资源不足，排队超时",
  "内容安全检测未通过",
  "生成超时，请重试",
  "渲染异常，请重试"
];

function resolveResolution(label: string) {
  const map: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "3:4": [768, 1024],
    "4:3": [1024, 768],
    "16:9": [1024, 576],
    "9:16": [576, 1024]
  };
  const [width, height] = map[label] || [1024, 1024];
  return `${width}×${height}`;
}

function randomError() {
  return generationErrors[Math.floor(Math.random() * generationErrors.length)];
}

function resetCreateConfig() {
  modelOptions.value = createModels;
  styleOptions.value = createStyles;
  qualityList.value = qualityOptions;
  ratioList.value = ratioOptions;
  gameplayOptions.value = gameplayTemplates;
  selectedModelIndex.value = Math.min(selectedModelIndex.value, modelOptions.value.length - 1);
  selectedQualityIndex.value = Math.min(selectedQualityIndex.value, qualityList.value.length - 1);
  selectedRatioIndex.value = Math.min(selectedRatioIndex.value, ratioList.value.length - 1);
  applyPendingRouteOptions();
}

async function loadCreateConfig() {
  if (useMockData.value) {
    resetCreateConfig();
    return;
  }

  try {
    const config = await fetchCreateConfig();
    modelOptions.value = config.models.length ? config.models : createModels;
    styleOptions.value = config.styles.length ? config.styles : createStyles;
    qualityList.value = config.qualities.length ? config.qualities : qualityOptions;
    ratioList.value = config.ratios.length ? config.ratios : ratioOptions;
    gameplayOptions.value = config.gameplays.length ? config.gameplays : gameplayTemplates;
    selectedModelIndex.value = Math.min(selectedModelIndex.value, modelOptions.value.length - 1);
    selectedQualityIndex.value = Math.min(selectedQualityIndex.value, qualityList.value.length - 1);
    selectedRatioIndex.value = Math.min(selectedRatioIndex.value, ratioList.value.length - 1);
    applyPendingRouteOptions();
  } catch {
    resetCreateConfig();
    showToast("创作配置加载失败，已使用本地配置");
  }
}

onLoad((query) => {
  const gameplay = typeof query?.gameplay === "string" ? decodeURIComponent(query.gameplay) : "";
  if (gameplay) {
    selectedGameplayName.value = gameplay;
  }

  const model = typeof query?.model === "string" ? decodeURIComponent(query.model) : "";
  pendingRouteOptions.value.model = model;
  applySelectedModel(model);

  const ratio = typeof query?.ratio === "string" ? decodeURIComponent(query.ratio) : "";
  pendingRouteOptions.value.ratio = ratio;
  applySelectedRatio(ratio);

  const quality = typeof query?.quality === "string" ? decodeURIComponent(query.quality) : "";
  pendingRouteOptions.value.quality = quality;
  applySelectedQuality(quality);

  const style = typeof query?.style === "string" ? decodeURIComponent(query.style) : "";
  pendingRouteOptions.value.style = style;
  applySelectedStyle(style);

  const prompt = typeof query?.prompt === "string" ? decodeURIComponent(query.prompt) : "";
  if (prompt) promptText.value = prompt.slice(0, 500);

  const jobId = typeof query?.jobId === "string" ? decodeURIComponent(query.jobId) : "";
  if (jobId) void resumeBackendJob(jobId);
});

onShow(() => {
  if (lastConfigMode !== useMockData.value) {
    lastConfigMode = useMockData.value;
    void loadCreateConfig();
  }

  const promptDraft = uni.getStorageSync("lumiCreatePromptDraft");
  if (typeof promptDraft === "string" && promptDraft.trim()) {
    promptText.value = promptDraft.slice(0, 500);
    uni.removeStorageSync("lumiCreatePromptDraft");
  }

  if (!isLoggedIn.value) {
    showLoginSheet.value = true;
  }
});

onBeforeUnmount(() => {
  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);
  if (pollTimer) clearTimeout(pollTimer);
});

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

function generatedImageUrl(seed: string, size = 800) {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function resultImageSrc(item: GenResult, size = 800) {
  return item.imageUrl || generatedImageUrl(item.seed, size);
}

function draftTitle(index = 0) {
  const base =
    selectedGameplayName.value ||
    selectedStyleName.value ||
    (promptText.value.trim() ? promptText.value.trim().slice(0, 18) : "AI 创作");
  return successCount.value > 1 ? `${base} ${index + 1}` : base;
}

function openLoginSheet() {
  showLoginSheet.value = true;
}

function ensureLogin() {
  return requireLogin(openLoginSheet);
}

async function login() {
  try {
    await commitLogin();
    showLoginSheet.value = false;
    showToast("登录成功");
  } catch {
    showToast("登录失败，请稍后重试");
  }
}

function chooseGameplay() {
  if (!ensureLogin()) return;
  gameplaySheetOpen.value = true;
}

function closeGameplaySheet() {
  gameplaySheetOpen.value = false;
}

function selectGameplayTemplate(name: string) {
  selectedGameplayName.value = name;
  closeGameplaySheet();
  showToast(`已套用「${name}」模板`);
}

function clearGameplayTemplate() {
  selectedGameplayName.value = "";
  closeGameplaySheet();
  showToast("已取消玩法模板");
}

function clearGameplay(event?: Event) {
  event?.stopPropagation();
  selectedGameplayName.value = "";
  showToast("已取消玩法模板");
}

function openRatioSheet() {
  if (!ensureLogin()) return;
  ratioSheetOpen.value = true;
}

function closeRatioSheet() {
  ratioSheetOpen.value = false;
}

function selectRatio(index: number) {
  selectedRatioIndex.value = index;
  closeRatioSheet();
}

function applySelectedModel(modelId: string) {
  if (!modelId) return;
  const index = modelOptions.value.findIndex((model) => model.id === modelId || model.name === modelId);
  if (index >= 0) selectedModelIndex.value = index;
}

function applySelectedRatio(label: string) {
  if (!label) return;
  const index = ratioList.value.findIndex((ratio) => ratio.label === label);
  if (index >= 0) selectedRatioIndex.value = index;
}

function applySelectedQuality(label: string) {
  if (!label) return;
  const index = qualityList.value.findIndex((quality) => quality.label === label || quality.description === label);
  if (index >= 0) selectedQualityIndex.value = index;
}

function applySelectedStyle(name: string) {
  if (!name) return;
  if (styleOptions.value.some((style) => style.name === name)) selectedStyleName.value = name;
}

function applyPendingRouteOptions() {
  applySelectedModel(pendingRouteOptions.value.model);
  applySelectedRatio(pendingRouteOptions.value.ratio);
  applySelectedQuality(pendingRouteOptions.value.quality);
  applySelectedStyle(pendingRouteOptions.value.style);
}

function openModelDrawer() {
  if (!ensureLogin()) return;
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
  if (!ensureLogin()) return;
  uni.navigateTo({
    url: "/pages/reverse-prompt/index"
  });
}

function selectStyle(name: string) {
  if (!ensureLogin()) return;
  selectedStyleName.value = name;
}

function openStyleSheet() {
  if (!ensureLogin()) return;
  styleSheetOpen.value = true;
}

function closeStyleSheet() {
  styleSheetOpen.value = false;
}

function selectStyleFromSheet(name: string) {
  selectedStyleName.value = name;
}

async function uploadPromptImage() {
  if (!ensureLogin()) return;
  if (isUploadingPromptImage.value) return;

  if (useMockData.value) {
    promptImage.value = `https://picsum.photos/seed/upload${Date.now()}/200/200`;
    showToast("图片已上传");
    return;
  }

  isUploadingPromptImage.value = true;
  try {
    const uploaded = await uploadChosenImage("prompt-image");
    promptImage.value = uploaded.publicUrl;
    showToast("图片已上传");
  } catch {
    showToast("图片上传失败，请稍后重试");
  } finally {
    isUploadingPromptImage.value = false;
  }
}

function removePromptImage(event?: Event) {
  event?.stopPropagation();
  promptImage.value = "";
}

function previewPromptImage() {
  if (!promptImage.value) return;
  uni.previewImage({
    urls: [promptImage.value],
    current: promptImage.value
  });
}

function clearPrompt() {
  promptText.value = "";
}

function ratioShapeStyle(width: number, height: number) {
  if (width === height) return { width: "28px", height: "28px" };
  if (width > height) return { width: "36px", height: "20px" };
  return { width: "20px", height: "36px" };
}

function isTerminalJob(status: BackendGenerateJob["status"]) {
  return ["succeeded", "partial_failed", "failed", "cancelled"].includes(status);
}

function toGeneratedResults(job: BackendGenerateJob): GenResult[] {
  if (!job.results.length && (job.status === "failed" || job.status === "cancelled")) {
    return [
      {
        id: job.id,
        failed: true,
        seed: job.id,
        error: job.errorMessage || job.stageText || "生成失败"
      }
    ];
  }

  return job.results.map((item, index) => ({
    id: item.id,
    resultId: item.id,
    failed: item.status === "failed" || !item.imageUrl,
    seed: item.id || `${job.id}-${index}`,
    imageUrl: item.imageUrl,
    savedWorkId: item.workId,
    error: item.errorMessage || "生成失败"
  }));
}

function applyBackendJob(job: BackendGenerateJob) {
  progress.value = Math.max(progress.value, Math.min(job.progress || 0, 100));
  stageText.value = job.stageText || stageText.value;

  if (!isTerminalJob(job.status)) return;

  if (pollTimer) clearTimeout(pollTimer);
  progress.value = job.status === "succeeded" || job.status === "partial_failed" ? 100 : progress.value;
  isGenerating.value = false;
  generatedResults.value = toGeneratedResults(job);
  genMeta.value = {
    time: Math.max(1, (new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(1),
    resolution: resolveResolution(selectedRatio.value.label),
    size: `${job.costCredits - job.refundCredits}积分`
  };

  const autoSaved = job.results.some((item) => item.workId);
  if (job.status === "succeeded") showToast(autoSaved ? "生成成功，已自动保存到草稿箱" : "生成成功");
  else if (job.status === "partial_failed") showToast(autoSaved ? "部分图片已自动保存到草稿箱" : "部分图片生成成功");
  else showToast(job.errorMessage || job.stageText || "生成失败，积分已按规则退回");
}

async function pollBackendJob(jobId: string) {
  try {
    const job = await fetchGenerateJob(jobId);
    applyBackendJob(job);
    if (!isTerminalJob(job.status)) {
      pollTimer = setTimeout(() => void pollBackendJob(jobId), 2000);
    }
  } catch {
    isGenerating.value = false;
    showToast("任务状态获取失败，请稍后在画廊查看");
  }
}

async function resumeBackendJob(jobId: string) {
  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);
  if (pollTimer) clearTimeout(pollTimer);

  isGenerating.value = true;
  progress.value = 0;
  generatedResults.value = [];
  genMeta.value = null;
  stageText.value = "正在读取生成任务...";

  try {
    const job = await fetchGenerateJob(jobId);
    promptText.value = job.prompt || promptText.value;
    applyBackendJob(job);
    if (!isTerminalJob(job.status)) {
      addActiveGenerateJobId(jobId);
      pollTimer = setTimeout(() => void pollBackendJob(jobId), 2000);
    }
  } catch {
    isGenerating.value = false;
    showToast("生成任务读取失败，请稍后重试");
  }
}

async function startBackendGenerate(prompt: string) {
  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);
  if (pollTimer) clearTimeout(pollTimer);

  isGenerating.value = true;
  progress.value = 0;
  generatedResults.value = [];
  genMeta.value = null;
  stageText.value = "任务提交中...";

  try {
    const created = await createGenerateJob({
      mode: promptImage.value ? "image-to-image" : "text-to-image",
      modelId: selectedModel.value.id,
      prompt,
      inputImageUrl: promptImage.value || undefined,
      style: selectedStyleName.value,
      ratio: selectedRatio.value.label,
      quality: selectedQuality.value.label,
      count: selectedCount.value
    });
    addActiveGenerateJobId(created.jobId);
    applyBackendJob(created.job);
    if (!isTerminalJob(created.job.status)) {
      pollTimer = setTimeout(() => void pollBackendJob(created.jobId), 2000);
    }
  } catch (error) {
    isGenerating.value = false;
    const message = error instanceof Error ? error.message : "提交失败，请稍后重试";
    showToast(message);
  }
}

async function startGenerate() {
  if (!ensureLogin()) return;

  const prompt = promptText.value.trim();
  if (!prompt) {
    showToast("请输入提示词");
    return;
  }

  if (!useMockData.value) {
    await startBackendGenerate(prompt);
    return;
  }

  if (progressTimer) clearInterval(progressTimer);
  if (finishTimer) clearTimeout(finishTimer);
  if (pollTimer) clearTimeout(pollTimer);

  isGenerating.value = true;
  progress.value = 0;
  generatedResults.value = [];
  genMeta.value = null;
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

    const count = selectedCount.value;
    const stamp = Date.now();
    const results: GenResult[] = Array.from({ length: count }, (_, index) => {
      const failed = Math.random() < 0.15;
      return {
        id: `gen-${stamp}-${index}`,
        failed,
        seed: `gen${stamp}${index}`,
        error: failed ? randomError() : ""
      };
    });
    generatedResults.value = results;
    genMeta.value = {
      time: (Math.random() * 8 + 7).toFixed(1),
      resolution: resolveResolution(selectedRatio.value.label),
      size: `${(Math.random() * 3 + 1.5).toFixed(1)}MB`
    };
    isGenerating.value = false;

    const fails = results.filter((item) => item.failed).length;
    const refund = fails * selectedModel.value.cost;
    if (fails === 0) showToast(`生成成功！消耗${totalCost.value}积分`);
    else if (fails === count) showToast(`全部生成失败，${totalCost.value}积分已退还`);
    else showToast(`${count - fails}张成功，${fails}张失败，退还${refund}积分`);
  }, 3600);
}

function openPreview(item: GenResult) {
  if (item.failed || !genMeta.value) return;
  previewData.value = {
    src: resultImageSrc(item),
    resolution: genMeta.value.resolution,
    size: genMeta.value.size,
    ratio: selectedRatio.value.label,
    resultId: item.resultId,
    savedWorkId: item.savedWorkId
  };
  previewSheetOpen.value = true;
}

function closePreview() {
  previewSheetOpen.value = false;
}

function zoomPreview() {
  if (!previewData.value) return;
  uni.previewImage({ urls: [previewData.value.src], current: previewData.value.src });
}

async function savePreview() {
  if (!previewData.value || isSavingDrafts.value) return;

  if (useMockData.value) {
    showToast("图片已保存到草稿箱");
    closePreview();
    return;
  }

  if (!ensureLogin()) return;
  if (previewData.value.savedWorkId) {
    showToast("图片已在草稿箱");
    closePreview();
    return;
  }

  isSavingDrafts.value = true;
  try {
    if (previewData.value.resultId) {
      const published = await publishGenerateResult(previewData.value.resultId, {
        title: draftTitle(),
        description: "",
        isPublic: false
      });
      const result = generatedResults.value.find((item) => item.resultId === previewData.value?.resultId);
      if (result) result.savedWorkId = published.workId;
      previewData.value.savedWorkId = published.workId;
      showToast("图片已保存到草稿箱");
      closePreview();
      return;
    }

    const uploaded = await uploadRemoteImage(previewData.value.src, "work");
    await createDraftWork({
      title: draftTitle(),
      description: "",
      prompt: promptText.value.trim(),
      imageUrl: uploaded.publicUrl,
      ratio: selectedRatio.value.label,
      quality: selectedQuality.value.label,
      modelId: selectedModel.value.id,
      style: selectedStyleName.value
    });
    showToast("图片已保存到草稿箱");
    closePreview();
  } catch {
    showToast("保存失败，请稍后重试");
  } finally {
    isSavingDrafts.value = false;
  }
}

async function saveAllResults() {
  if (!ensureLogin()) return;
  if (isSavingDrafts.value) return;

  const successfulResults = generatedResults.value.filter((item) => !item.failed);
  if (!successfulResults.length) {
    showToast("暂无可保存图片");
    return;
  }

  if (useMockData.value) {
    showToast("全部图片已保存到草稿箱");
    return;
  }

  isSavingDrafts.value = true;
  try {
    let savedCount = 0;
    for (const [index, item] of successfulResults.entries()) {
      if (item.savedWorkId) continue;
      if (item.resultId) {
        const published = await publishGenerateResult(item.resultId, {
          title: draftTitle(index),
          description: "",
          isPublic: false
        });
        item.savedWorkId = published.workId;
        savedCount += 1;
        continue;
      }

      const uploaded = await uploadRemoteImage(resultImageSrc(item), "work", `${item.seed}.jpg`);
      await createDraftWork({
        title: draftTitle(index),
        description: "",
        prompt: promptText.value.trim(),
        imageUrl: uploaded.publicUrl,
        ratio: selectedRatio.value.label,
        quality: selectedQuality.value.label,
        modelId: selectedModel.value.id,
        style: selectedStyleName.value
      });
      savedCount += 1;
    }
    showToast(savedCount ? `已保存 ${savedCount} 张到草稿箱` : "图片已在草稿箱");
  } catch {
    showToast("保存失败，请稍后重试");
  } finally {
    isSavingDrafts.value = false;
  }
}

async function goPublish() {
  if (!ensureLogin()) return;
  if (!useMockData.value && generatedResults.value.some((item) => !item.failed && !item.savedWorkId)) {
    await saveAllResults();
  }
  uni.navigateTo({ url: "/pages/publish/index" });
}
</script>

<template>
  <view class="create-page">
    <scroll-view class="create-scroll" scroll-y>
      <view class="create-content">
        <view v-if="!isLoggedIn" class="login-gate">
          <view class="login-gate-icon">✎</view>
          <view class="login-gate-title">登录后开始 AI 创作</view>
          <view class="login-gate-sub">登录即可使用模型、上传参考图、保存作品与管理草稿</view>
          <button class="login-gate-btn" @click="openLoginSheet">立即登录</button>
        </view>

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
            <view class="prompt-action accent" :class="{ disabled: isUploadingPromptImage }" @click="uploadPromptImage">
              {{ isUploadingPromptImage ? "上传中..." : "上传图片" }}
            </view>
            <view class="action-spacer" />
            <view v-if="promptText" class="prompt-action neutral has-icon" @click="clearPrompt">
              <text class="prompt-action-icon">⌫</text>
              <text>清除</text>
            </view>
          </view>
          <view v-if="promptImage" class="prompt-preview" @click="previewPromptImage">
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
            <view class="style-card" :class="{ selected: moreStyleSelected }" @click="openStyleSheet">
              <image class="style-img" :src="styleOptions[7]?.image || styleOptions[0]?.image" mode="aspectFill" />
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
              v-for="(quality, index) in qualityList"
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
            <text class="more-link" @click="openRatioSheet">全部尺寸 ›</text>
          </view>
          <view class="ratio-grid">
            <view
              v-for="(ratio, index) in inlineRatios"
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
            <view class="progress-ring" :style="{ '--progress': progress }">
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
          <view v-else-if="generatedResults.length" class="result-wrap">
            <view class="result-grid">
              <template v-for="item in generatedResults" :key="item.id">
                <view v-if="item.failed" class="result-cell failed">
                  <text class="fail-icon">✕</text>
                  <text class="fail-msg">{{ item.error }}</text>
                </view>
                <view v-else class="result-img" @click="openPreview(item)">
                  <image :src="resultImageSrc(item, 400)" mode="aspectFill" />
                </view>
              </template>
            </view>
            <view v-if="failCount > 0" class="refund-note">
              <text v-if="successCount > 0">{{ failCount }}张生成失败，已退还 {{ refundCredits }} 积分</text>
              <text v-else>全部失败，已退还 {{ totalCost }} 积分</text>
            </view>
            <view v-if="genMeta" class="result-meta">
              <text class="meta-item">耗时 {{ genMeta.time }}s</text>
              <text class="meta-item">{{ genMeta.resolution }}</text>
              <text class="meta-item">{{ genMeta.size }}</text>
              <text class="meta-item">{{ selectedModel.name }}</text>
            </view>
            <view class="result-actions">
              <button class="result-action ghost" @click="goPublish">
                <text class="result-action-icon">✈</text>
                <text>发布作品</text>
              </button>
              <button class="result-action primary" :disabled="isSavingDrafts" @click="saveAllResults">
                <text class="result-action-icon">⇩</text>
                <text>{{ isSavingDrafts ? "保存中..." : "全部保存" }}</text>
              </button>
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
      <view class="create-bottom-inner">
        <view class="create-bottom-row">
          <view class="cost-wrap">
            <text class="bottom-cost">{{ totalCost }}</text>
            <text class="bottom-unit">积分</text>
          </view>
          <button class="create-btn" :class="{ disabled: !isLoggedIn }" @click="startGenerate">
            {{ isLoggedIn ? "✦ 开始创作" : "→ 登录后创作" }}
          </button>
        </view>
        <text class="bottom-note">内容由AI生成，仅供参考</text>
      </view>
    </view>
    <LumiLoginSheet :open="showLoginSheet" @close="showLoginSheet = false" @login="login" />
    <view class="model-overlay" :class="{ show: modelDrawerOpen }" @click="closeModelDrawer" />
    <view class="model-sheet" :class="{ show: modelDrawerOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title-row">
        <view>
          <view class="sheet-title">切换模型</view>
          <view class="sheet-count">共 {{ modelOptions.length }} 款模型可选</view>
        </view>
      </view>
      <scroll-view class="model-drawer-scroll" scroll-y>
        <view class="model-drawer-list">
          <view
            v-for="(model, index) in modelOptions"
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

    <view class="model-overlay" :class="{ show: gameplaySheetOpen }" @click="closeGameplaySheet" />
    <view class="model-sheet" :class="{ show: gameplaySheetOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title-row">
        <view class="sheet-title">选择玩法模板</view>
      </view>
      <scroll-view class="gameplay-drawer-scroll" scroll-y>
        <view class="gameplay-drawer-grid">
          <view class="gameplay-clear-card" @click="clearGameplayTemplate">
            <text class="gameplay-clear-icon">×</text>
            <text class="gameplay-clear-label">不使用</text>
          </view>
          <view
            v-for="template in gameplayOptions"
            :key="template.name"
            class="gameplay-drawer-card"
            :class="{ selected: selectedGameplayName === template.name }"
            @click="selectGameplayTemplate(template.name)"
          >
            <image class="gameplay-drawer-img" :src="template.image" mode="aspectFill" />
            <view class="gameplay-drawer-shade" />
            <view class="gameplay-drawer-info">
              <text class="gameplay-drawer-name">{{ template.name }}</text>
              <text class="gameplay-drawer-uses">♨ {{ template.uses }}</text>
            </view>
            <view v-if="selectedGameplayName === template.name" class="gameplay-drawer-check">✓</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="model-overlay" :class="{ show: ratioSheetOpen }" @click="closeRatioSheet" />
    <view class="model-sheet" :class="{ show: ratioSheetOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title-row">
        <view class="sheet-title">选择尺寸</view>
        <view class="sheet-close" @click="closeRatioSheet">×</view>
      </view>
      <view class="ratio-sheet-grid">
        <view
          v-for="(ratio, index) in ratioList"
          :key="ratio.label"
          class="ratio-card"
          :class="{ selected: selectedRatioIndex === index }"
          @click="selectRatio(index)"
        >
          <view class="ratio-shape" :style="ratioShapeStyle(ratio.width, ratio.height)" />
          <text class="ratio-name">{{ ratio.label }}</text>
        </view>
      </view>
    </view>

    <view class="model-overlay" :class="{ show: styleSheetOpen }" @click="closeStyleSheet" />
    <view class="model-sheet" :class="{ show: styleSheetOpen }">
      <view class="sheet-handle" />
      <view class="sheet-title-row">
        <view class="style-sheet-head">
          <text class="sheet-title">选择风格</text>
          <text class="sheet-count">共 {{ allStyles.length }} 种风格可选</text>
        </view>
      </view>
      <scroll-view class="style-sheet-scroll" scroll-y>
        <view class="style-sheet-grid">
          <view
            v-for="style in allStyles"
            :key="style.name"
            class="style-sheet-card"
            :class="{ selected: selectedStyleName === style.name }"
            @click="selectStyleFromSheet(style.name)"
          >
            <image class="style-img" :src="style.image" mode="aspectFill" />
            <view class="style-overlay" />
            <text class="style-label">{{ style.name }}</text>
          </view>
        </view>
      </scroll-view>
      <button class="style-confirm-btn" @click="closeStyleSheet">确认选择</button>
    </view>

    <view class="model-overlay" :class="{ show: previewSheetOpen }" @click="closePreview" />
    <view class="model-sheet preview-sheet" :class="{ show: previewSheetOpen }">
      <view class="sheet-handle" />
      <view class="preview-head">
        <text class="preview-title">图片预览</text>
        <view class="preview-head-actions">
          <button class="preview-ghost-btn" :disabled="isSavingDrafts" @click="savePreview">
            <text class="preview-btn-icon">⇩</text>
            <text>{{ isSavingDrafts ? "保存中..." : "保存" }}</text>
          </button>
          <button class="preview-ghost-btn icon" @click="closePreview">×</button>
        </view>
      </view>
      <view v-if="previewData" class="preview-img-wrap" @click="zoomPreview">
        <image class="preview-img" :src="previewData.src" mode="widthFix" />
      </view>
      <view v-if="previewData" class="preview-info">
        <text class="meta-item">{{ previewData.resolution }}</text>
        <text class="meta-item">{{ previewData.size }}</text>
        <text class="meta-item">{{ selectedModel.name }}</text>
        <text class="meta-item">{{ previewData.ratio }}</text>
      </view>
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
  background: var(--page-bg);
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

.login-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 24px 28px;
  margin: 0 16px 14px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(91, 159, 232, 0.08);
}

.login-gate-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 14px;
  font-size: 32px;
  color: #fff;
  background: var(--gradient-dream);
  border-radius: 20px;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.login-gate-title {
  margin-bottom: 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--fg-primary);
}

.login-gate-sub {
  max-width: 260px;
  margin-bottom: 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.login-gate-btn {
  width: 70%;
  height: 40px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-dream);
  border: none;
  border-radius: 12px;
}

.login-gate-btn::after {
  border: none;
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
  border: 1px solid var(--card-border);
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
  transition: border-color 0.3s, box-shadow 0.3s;
}

.prompt-box:focus-within .prompt-input {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
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

.prompt-action.disabled {
  opacity: 0.65;
}

.prompt-action.has-icon {
  display: flex;
  gap: 4px;
  align-items: center;
}

.prompt-action-icon {
  font-size: 14px;
  line-height: 1;
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
  grid-template-columns: repeat(4, 1fr);
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

@property --progress {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}

.progress-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: conic-gradient(var(--accent) calc(var(--progress, 0) * 1%), var(--border) 0);
  border-radius: 50%;
  transition: --progress 0.4s ease;
}

.progress-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.result-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  aspect-ratio: 1;
  padding: 0 8px;
  text-align: center;
  background: var(--bg-soft);
  border-radius: 7px;
}

.result-cell.failed {
  border: 1.5px dashed var(--rose);
}

.fail-icon {
  font-size: 26px;
  color: var(--rose);
}

.fail-msg {
  font-size: 11px;
  line-height: 1.4;
  color: var(--rose);
}

.refund-note {
  margin-top: 10px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mint);
  background: var(--mint-soft);
  border: 1px solid rgba(111, 212, 176, 0.3);
  border-radius: 10px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--fg-muted);
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-action {
  display: inline-flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
}

.result-action::after {
  border: none;
}

.result-action[disabled],
.preview-ghost-btn[disabled] {
  opacity: 0.65;
}

.result-action-icon {
  font-size: 15px;
  line-height: 1;
}

.result-action.ghost {
  color: var(--fg-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.result-action.primary {
  color: #fff;
  background: var(--accent);
}

.create-bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  padding: 12px 16px 14px;
  background: var(--bg-glass);
  border-top: 0.5px solid var(--border);
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
  backdrop-filter: blur(20px) saturate(180%);
}

.create-bottom-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.create-bottom-row {
  display: flex;
  gap: 12px;
  align-items: center;
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
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 14px;
}

.create-btn.disabled {
  background: var(--bg-soft);
  color: var(--accent);
}

.bottom-note {
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

.gameplay-drawer-scroll {
  max-height: calc(76vh - 82px);
}

.gameplay-drawer-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-bottom: 4px;
}

.gameplay-clear-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: var(--bg-soft);
  border: 1.5px dashed var(--border-strong);
  border-radius: 12px;
}

.gameplay-clear-icon {
  font-size: 22px;
  color: var(--fg-muted);
}

.gameplay-clear-label {
  font-size: 11px;
  color: var(--fg-muted);
}

.gameplay-drawer-card {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 12px;
}

.gameplay-drawer-card.selected {
  border-color: var(--accent);
}

.gameplay-drawer-img {
  display: block;
  width: 100%;
  height: 100%;
}

.gameplay-drawer-shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.55) 0%, transparent 60%);
}

.gameplay-drawer-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.gameplay-drawer-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.gameplay-drawer-uses {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.gameplay-drawer-check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.ratio-sheet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.style-sheet-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.style-sheet-scroll {
  max-height: calc(76vh - 140px);
}

.style-sheet-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-bottom: 4px;
}

.style-sheet-card {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 12px;
}

.style-sheet-card.selected {
  border-color: var(--accent);
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.28);
}

.style-confirm-btn {
  width: 100%;
  height: 46px;
  margin-top: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #b8a5e3, #5b9fe8, #6fd4b0);
  border: none;
  border-radius: 12px;
}

.style-confirm-btn::after {
  border: none;
}

.preview-sheet {
  max-height: 92vh;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg-primary);
}

.preview-head-actions {
  display: flex;
  gap: 8px;
}

.preview-ghost-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 14px;
  color: var(--fg-secondary);
  background: transparent;
  border: none;
  border-radius: 8px;
}

.preview-ghost-btn::after {
  border: none;
}

.preview-btn-icon {
  font-size: 15px;
  line-height: 1;
}

.preview-ghost-btn.icon {
  padding: 6px 10px;
  font-size: 18px;
}

.preview-img-wrap {
  overflow: hidden;
  margin-bottom: 12px;
  cursor: pointer;
  background: var(--bg-base);
  border-radius: 16px;
}

.preview-img {
  display: block;
  width: 100%;
}

.preview-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 14px;
  color: var(--fg-muted);
}
</style>
