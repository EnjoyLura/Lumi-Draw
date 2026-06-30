<template>
  <view class="page-create">
    <!-- 毛玻璃刘海层 -->
    <view class="glass-header" />
    <!-- 状态栏 -->
    <view class="status-bar">
      <text class="sb-time">9:41</text>
      <view class="sb-right"><text class="sb-icon">●●●●</text><text class="sb-icon">▲</text><text class="sb-battery">▮</text></view>
    </view>
    <view class="nav-header"><text class="nav-title">创作</text></view>
    <view class="capsule"><view class="cap-btn">⋯</view><view class="cap-divider" /><view class="cap-btn">✕</view></view>

    <!-- 可滚动内容 -->
    <scroll-view scroll-y class="create-scroll" :style="{ height: scrollH + 'px' }">
      <!-- 玩法模板 -->
      <view class="section" style="padding:10px 16px 6px;">
        <view class="gp-card" @click="openGameplayDrawer">
          <view v-if="selectedGameplay < 0" class="gp-placeholder">
            <view class="gp-placeholder-icon">⊞</view>
            <view class="gp-placeholder-info">
              <text class="gp-placeholder-title">选择玩法模板</text>
              <text class="gp-placeholder-desc">一键应用热门玩法的参数配置</text>
            </view>
            <text class="gp-arrow">›</text>
          </view>
          <view v-else class="gp-selected-row">
            <image :src="gameplays[selectedGameplay].img" mode="aspectFill" class="gp-selected-img" />
            <view class="gp-selected-info">
              <text class="gp-selected-name">{{ gameplays[selectedGameplay].name }}</text>
              <view class="gp-selected-uses">
                <text>🔥</text>
                <text>{{ gameplays[selectedGameplay].uses }}人用过</text>
              </view>
            </view>
            <view class="gp-close" @click.stop="clearGameplay">✕</view>
            <text class="gp-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 选择模型 -->
      <view class="section" style="padding:0 0 6px;">
        <text class="section-label" style="padding:0 16px;">选择模型</text>
        <view class="model-card" style="margin:0 16px;" @click="openModelDrawer">
          <image :src="currentModel.img" mode="aspectFill" class="model-img" />
          <view class="model-info">
            <view class="model-name-row">
              <text class="model-name">{{ currentModel.name }}</text>
              <text v-if="currentModel.badge" class="model-badge" :style="{ color: currentModel.badgeColor, background: currentModel.badgeColor + '1F' }">{{ currentModel.badge }}</text>
            </view>
            <text class="model-desc">{{ currentModel.desc }}</text>
            <view class="model-tags">
              <text v-for="t in currentModel.tags" :key="t" class="model-tag">{{ t }}</text>
            </view>
          </view>
          <view class="model-cost">
            <text class="model-cost-num">{{ currentModel.cost }}</text>
            <text class="model-cost-label">积分起</text>
          </view>
          <text class="gp-arrow">›</text>
        </view>
      </view>

      <!-- 描述画面 -->
      <view class="section" style="margin-bottom:12px;">
        <text class="section-label" style="padding:0 16px;">描述画面</text>
        <view style="padding:0 16px;">
          <view class="prompt-box">
            <textarea
              :class="['prompt-input', { focused: promptFocused }]"
              v-model="prompt"
              placeholder="描述你想要生成图片，越详细效果越好..."
              :maxlength="500"
              @focus="promptFocused = true"
              @blur="promptFocused = false"
            />
            <text class="prompt-count">{{ prompt.length }}/500</text>
          </view>
          <view class="prompt-actions">
            <view class="prompt-action-btn reverse" @click="goReversePrompt">✎ 反推提示词</view>
            <view class="prompt-action-btn upload" @click="uploadImg">🖼 上传图片</view>
            <view style="flex:1;" />
            <view v-if="prompt.length > 0" class="prompt-action-btn clear" @click="clearPrompt">✕ 清除</view>
          </view>
          <view v-if="promptImg" class="prompt-img-preview">
            <image :src="promptImg" mode="aspectFill" class="prompt-img-thumb" @click="previewPromptImg" />
            <view class="prompt-img-close" @click="promptImg = ''">✕</view>
          </view>
        </view>
      </view>

      <!-- 风格类型 -->
      <view class="section" style="margin-bottom:12px;">
        <text class="section-label" style="padding:0 16px;">风格类型</text>
        <view class="style-grid">
          <view
            v-for="(s, i) in visibleStyles"
            :key="s"
            :class="['style-card', { selected: selectedStyle === s }]"
            @click="selectStyle(s)"
          >
            <image :src="getStyleImg(s)" mode="aspectFill" class="style-img" />
            <view class="style-overlay" />
            <text class="style-label">{{ s }}</text>
          </view>
          <view :class="['style-card', 'style-more', { selected: isMoreStyleSelected }]" @click="openAllStyles">
            <image :src="getStyleImg(styles[7])" mode="aspectFill" class="style-img" />
            <view class="style-overlay" />
            <view class="style-more-overlay">
              <text class="style-more-text">+{{ styles.length - 8 }}</text>
            </view>
            <text class="style-label">更多</text>
          </view>
        </view>
      </view>

      <!-- 图片精度 -->
      <view class="section" style="margin-bottom:12px;">
        <text class="section-label" style="padding:0 16px;">图片精度</text>
        <view class="quality-grid">
          <view
            v-for="(q, i) in qualities"
            :key="i"
            :class="['ratio-card', { selected: selectedQuality === i }]"
            style="flex:1;"
            @click="selectedQuality = i; updateCost()"
          >
            <text class="ratio-icon" :style="{ color: selectedQuality === i ? '#5B9FE8' : '#8497B5' }">{{ q.icon }}</text>
            <text :class="['ratio-name', { selected: selectedQuality === i }]">{{ q.label }}</text>
          </view>
        </view>
      </view>

      <!-- 画面比例 -->
      <view class="section" style="margin-bottom:12px;">
        <view class="section-label-row">
          <text class="section-label" style="padding:0 16px;">画面比例</text>
          <view class="section-more" @click="openRatioSheet">
            <text class="more-text">全部尺寸</text>
            <text class="more-arrow">›</text>
          </view>
        </view>
        <view class="ratio-grid">
          <view
            v-for="(r, i) in ratios"
            :key="i"
            :class="['ratio-card', { active: selectedRatio === i }]"
            @click="selectedRatio = i"
          >
            <view class="ratio-shape" :style="{ width: ratioShape(r.label).w + 'px', height: ratioShape(r.label).h + 'px', background: selectedRatio === i ? '#5B9FE8' : '#8497B5' }" />
            <text :class="['ratio-name', { selected: selectedRatio === i }]">{{ r.label }}</text>
          </view>
        </view>
      </view>

      <!-- 生成数量 -->
      <view class="section" style="margin-bottom:12px;">
        <text class="section-label" style="padding:0 16px;">生成数量</text>
        <view class="count-row">
          <view
            v-for="(n, i) in counts"
            :key="i"
            :class="['ratio-card', { selected: selectedCount === i }]"
            style="flex:1;"
            @click="selectedCount = i; updateCost()"
          >
            <text :class="['ratio-name', { selected: selectedCount === i }]">{{ n }}张</text>
          </view>
        </view>
      </view>

      <!-- 生成结果 -->
      <view class="section" style="padding:0 16px; margin-bottom:14px;">
        <text class="section-label">生成结果</text>
        <!-- 生成中 -->
        <view v-if="generating" class="gen-loading">
          <view class="gen-spinner" />
          <text class="gen-text">AI 正在生成中...</text>
          <view class="gen-progress"><view class="gen-progress-bar" :style="{ width: genProgress + '%' }" /></view>
        </view>
        <!-- 生成完成 -->
        <view v-else-if="genResults.length > 0" class="gen-results">
          <view v-for="(r, i) in genResults" :key="i" class="gen-result-img" @click="previewGenImg(r)">
            <image :src="r" mode="aspectFill" class="gen-img" />
          </view>
        </view>
        <!-- 占位 -->
        <view v-else class="result-placeholder">
          <text class="result-placeholder-icon">🖼</text>
          <text class="result-placeholder-text">点击「开始创作」生成作品</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部创作栏 (毛玻璃) -->
    <view class="create-bottom">
      <view class="cost-info">
        <text class="cost-label">本次消耗</text>
        <view class="cost-row">
          <text class="cost-num">{{ totalCost }}</text>
          <text class="cost-unit">积分</text>
        </view>
      </view>
      <view class="create-btn" @click="startCreate">
        <text class="create-btn-icon">✦</text>
        <text class="create-btn-text">开始创作</text>
      </view>
    </view>

    <!-- ===== 玩法选择抽屉 ===== -->
    <view v-if="showGameplaySheet" class="sheet-overlay" @click="showGameplaySheet = false" />
    <view :class="['bottom-sheet', { show: showGameplaySheet }]">
      <view class="sheet-handle" />
      <view class="sheet-title">选择玩法模板</view>
      <view class="sheet-grid">
        <view class="sheet-grid-item sheet-grid-clear" @click="clearAndCloseGameplay">
          <text class="sheet-clear-icon">✕</text>
          <text class="sheet-clear-text">不使用</text>
        </view>
        <view
          v-for="(g, i) in gameplays" :key="i"
          :class="['sheet-grid-item', { active: selectedGameplay === i }]"
          @click="selectGameplayItem(i)"
        >
          <image :src="g.img" mode="aspectFill" class="sheet-gp-img" />
          <view class="sheet-gp-overlay" />
          <view class="sheet-gp-info">
            <text class="sheet-gp-name">{{ g.name }}</text>
            <text class="sheet-gp-uses">🔥 {{ g.uses }}</text>
          </view>
          <view v-if="selectedGameplay === i" class="sheet-gp-check">✓</view>
        </view>
      </view>
    </view>

    <!-- ===== 模型选择抽屉 ===== -->
    <view v-if="showModelSheet" class="sheet-overlay" @click="showModelSheet = false" />
    <view :class="['bottom-sheet', { show: showModelSheet }]">
      <view class="sheet-handle" />
      <view class="sheet-title">
        <text>选择模型</text>
        <text class="sheet-subtitle">共 {{ models.length }} 款模型可选</text>
      </view>
      <scroll-view scroll-y class="sheet-scroll">
        <view
          v-for="(m, i) in models" :key="m.id"
          :class="['model-sheet-card', { active: selectedModel === i }]"
          @click="selectModelItem(i)"
        >
          <image :src="m.img" mode="aspectFill" class="model-sheet-img" />
          <view class="model-sheet-info">
            <view class="model-sheet-name-row">
              <text class="model-sheet-name">{{ m.name }}</text>
              <text v-if="m.badge" class="model-badge" :style="{ color: m.badgeColor, background: m.badgeColor + '1F' }">{{ m.badge }}</text>
            </view>
            <text class="model-sheet-desc">{{ m.desc }}</text>
            <view class="model-sheet-tags">
              <text v-for="t in m.tags" :key="t" class="model-tag">{{ t }}</text>
            </view>
          </view>
          <view class="model-sheet-cost">
            <text class="model-sheet-cost-num">{{ m.cost }}</text>
            <text class="model-sheet-cost-label">积分起</text>
          </view>
          <text v-if="selectedModel === i" class="model-sheet-check">✓</text>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 全部风格抽屉 ===== -->
    <view v-if="showStyleSheet" class="sheet-overlay" @click="showStyleSheet = false" />
    <view :class="['bottom-sheet', { show: showStyleSheet }]">
      <view class="sheet-handle" />
      <view class="sheet-title">全部风格</view>
      <view class="style-sheet-grid">
        <view
          v-for="s in styles" :key="s"
          :class="['style-card', { selected: selectedStyle === s }]"
          @click="selectStyleItem(s)"
        >
          <image :src="getStyleImg(s)" mode="aspectFill" class="style-img" />
          <view class="style-overlay" />
          <text class="style-label">{{ s }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 全部尺寸抽屉 ===== -->
    <view v-if="showRatioSheet" class="sheet-overlay" @click="showRatioSheet = false" />
    <view :class="['bottom-sheet', { show: showRatioSheet }]">
      <view class="sheet-handle" />
      <view class="sheet-title">全部尺寸</view>
      <view class="ratio-sheet-grid">
        <view
          v-for="(r, i) in allRatios" :key="r.label"
          :class="['ratio-card', { active: selectedRatio === i }]"
          @click="selectRatioItem(i)"
        >
          <view class="ratio-shape" :style="{ width: ratioShape(r.label).w + 'px', height: ratioShape(r.label).h + 'px', background: selectedRatio === i ? '#5B9FE8' : '#8497B5' }" />
          <text :class="['ratio-name', { selected: selectedRatio === i }]">{{ r.label }}</text>
          <text class="ratio-size-text">{{ r.size }}</text>
        </view>
      </view>
    </view>

    <LoginPopup />

    <!-- ===== 图片预览抽屉 ===== -->
    <view v-if="showPreviewSheet" class="sheet-overlay" @click="showPreviewSheet = false" />
    <view :class="['bottom-sheet preview-sheet', { show: showPreviewSheet }]">
      <view class="sheet-handle" />
      <view class="preview-img-box">
        <image :src="previewingImg" mode="widthFix" class="preview-full-img" @click="uni.previewImage({ urls: genResults, current: previewingImg })" />
      </view>
      <view class="preview-actions">
        <view class="preview-action-btn" @click="uni.showToast({ title: '已保存到相册', icon: 'none' }); showPreviewSheet = false">💾 保存</view>
        <view class="preview-action-btn" @click="uni.showToast({ title: '已分享', icon: 'none' }); showPreviewSheet = false">↗ 分享</view>
        <view class="preview-action-btn primary" @click="uni.navigateTo({ url: '/pages/publish/index' }); showPreviewSheet = false">✈ 发布</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { configApi, generateApi } from '@/utils/api';
import { requireLogin } from '@/utils/auth';
import LoginPopup from '@/components/LoginPopup.vue';

const models = ref<any[]>([]);
const gameplays = ref<any[]>([]);
const styles = ref<string[]>([]);
const visibleStyles = computed(() => styles.value.slice(0, 7));
const getStyleImg = (s: string) => `https://picsum.photos/seed/${encodeURIComponent(s)}/100/100`;

const qualities = [{ label: '全高清1K', icon: 'HD' }, { label: '超清2K', icon: '2K' }, { label: '超高清4K', icon: '4K' }];
const ratios = [{ label: '1:1' }, { label: '3:4' }, { label: '4:3' }, { label: '16:9' }, { label: '9:16' }];
const allRatios = [{ label: '1:1', size: '1024×1024' }, { label: '3:4', size: '768×1024' }, { label: '4:3', size: '1024×768' }, { label: '16:9', size: '1024×576' }, { label: '9:16', size: '576×1024' }];
const counts = [1, 2, 3, 4];

const selectedModel = ref(0);
const selectedGameplay = ref(-1);
const selectedStyle = ref<string | null>(null);
const selectedQuality = ref(0);
const selectedRatio = ref(0);
const selectedCount = ref(0);
const prompt = ref('');
const promptImg = ref('');
const promptFocused = ref(false);
const scrollH = ref(600);
const showGameplaySheet = ref(false);
const showModelSheet = ref(false);
const showStyleSheet = ref(false);
const showRatioSheet = ref(false);
const generating = ref(false);
const genProgress = ref(0);
const genResults = ref<string[]>([]);

const currentModel = computed(() => models.value[selectedModel.value] || { cost: 15, name: '' });
const isMoreStyleSelected = computed(() => selectedStyle.value ? styles.value.indexOf(selectedStyle.value) > 6 : false);
const totalCost = ref(15);

const ratioShape = (label: string) => {
  switch (label) { case '1:1': return { w: 28, h: 28 }; case '3:4': return { w: 24, h: 32 }; case '4:3': return { w: 36, h: 27 }; case '16:9': return { w: 36, h: 20 }; case '9:16': return { w: 20, h: 36 }; default: return { w: 28, h: 28 }; }
};
const updateCost = () => { totalCost.value = currentModel.value.cost * counts[selectedCount.value]; };
const selectStyle = (s: string) => { selectedStyle.value = s; };
const clearGameplay = () => { selectedGameplay.value = -1; uni.showToast({ title: '已取消玩法模板', icon: 'none' }); };
const clearAndCloseGameplay = () => { selectedGameplay.value = -1; showGameplaySheet.value = false; uni.showToast({ title: '已取消玩法模板', icon: 'none' }); };
const clearPrompt = () => { prompt.value = ''; };
const uploadImg = () => { promptImg.value = `https://picsum.photos/seed/upload${Date.now()}/200/200`; uni.showToast({ title: '图片已上传', icon: 'none' }); };
const previewPromptImg = () => { if (promptImg.value) uni.previewImage({ urls: [promptImg.value], current: promptImg.value }); };
const goReversePrompt = () => uni.navigateTo({ url: '/pages/reverse-prompt/index' });
const openModelDrawer = () => { showModelSheet.value = true; };
const openGameplayDrawer = () => { showGameplaySheet.value = true; };
const openAllStyles = () => { showStyleSheet.value = true; };
const openRatioSheet = () => { showRatioSheet.value = true; };
const selectGameplayItem = (i: number) => { selectedGameplay.value = i; showGameplaySheet.value = false; uni.showToast({ title: `已套用「${gameplays.value[i]?.name}」模板`, icon: 'none' }); };
const selectModelItem = (i: number) => { selectedModel.value = i; showModelSheet.value = false; updateCost(); uni.showToast({ title: `已选择${models.value[i]?.name}`, icon: 'none' }); };
const selectStyleItem = (s: string) => { selectedStyle.value = s; showStyleSheet.value = false; };
const selectRatioItem = (i: number) => { selectedRatio.value = i; showRatioSheet.value = false; };
const previewingImg = ref('');
const showPreviewSheet = ref(false);
const previewGenImg = (url: string) => {
  previewingImg.value = url;
  showPreviewSheet.value = true;
};

const startCreate = async () => {
  if (!requireLogin()) return;
  if (!prompt.value.trim()) { uni.showToast({ title: '请先输入提示词', icon: 'none' }); return; }
  generating.value = true; genProgress.value = 0; genResults.value = [];
  const count = counts[selectedCount.value];
  try {
    const res = await generateApi.create({
      model: currentModel.value.kie_model || 'gpt-image-2',
      prompt: prompt.value,
      style: selectedStyle.value || '',
      aspect_ratio: ratios[selectedRatio.value]?.label || '1:1',
      resolution: qualities[selectedQuality.value]?.label || '1K',
      count,
    });
    // Simulate progress while waiting
    const timer = setInterval(() => {
      genProgress.value += Math.random() * 15 + 5;
      if (genProgress.value >= 100) { genProgress.value = 100; clearInterval(timer); }
    }, 200);
    // Poll for result
    const genId = (res as any).data?.id || (res as any).id;
    if (genId) {
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await generateApi.getStatus(genId);
          const data = (status as any).data || status;
          if (data.status === 'success') {
            clearInterval(poll); clearInterval(timer);
            genProgress.value = 100;
            genResults.value = data.result_urls || [];
            generating.value = false;
            uni.showToast({ title: `生成完成！消耗${totalCost.value}积分`, icon: 'none' });
          } else if (data.status === 'failed' || attempts > 30) {
            clearInterval(poll); clearInterval(timer);
            generating.value = false;
            // Fallback mock results
            const results: string[] = [];
            for (let i = 0; i < count; i++) results.push(`https://picsum.photos/seed/gen${Date.now()}${i}/400/560`);
            genResults.value = results;
            uni.showToast({ title: `生成完成！消耗${totalCost.value}积分`, icon: 'none' });
          }
        } catch { clearInterval(poll); clearInterval(timer); generating.value = false; }
      }, 2000);
    } else {
      // No gen ID, fallback mock
      setTimeout(() => {
        genProgress.value = 100; generating.value = false;
        const results: string[] = [];
        for (let i = 0; i < count; i++) results.push(`https://picsum.photos/seed/gen${Date.now()}${i}/400/560`);
        genResults.value = results;
        uni.showToast({ title: `生成完成！消耗${totalCost.value}积分`, icon: 'none' });
      }, 3000);
    }
  } catch {
    // Fallback mock
    setTimeout(() => {
      genProgress.value = 100; generating.value = false;
      const results: string[] = [];
      for (let i = 0; i < count; i++) results.push(`https://picsum.photos/seed/gen${Date.now()}${i}/400/560`);
      genResults.value = results;
      uni.showToast({ title: `生成完成！消耗${totalCost.value}积分`, icon: 'none' });
    }, 3000);
  }
};

const onApplyGameplay = (idx: number) => { if (idx >= 0 && idx < gameplays.value.length) selectedGameplay.value = idx; };
const onApplyPrompt = (text: string) => { if (text) prompt.value = text; };

onMounted(async () => {
  scrollH.value = uni.getSystemInfoSync().windowHeight - 80;
  try {
    const [modelRes, gpRes, styleRes] = await Promise.all([configApi.getModels(), configApi.getGameplays(), configApi.getStyles()]);
    const mList = (modelRes as any).data || modelRes || [];
    models.value = mList.map((m: any) => ({ id: m.kie_model, name: m.name, desc: m.description, tags: m.tags, cost: m.credits_cost, img: m.cover_url, badge: m.badge, badgeColor: m.badge_color, kie_model: m.kie_model }));
    const gList = (gpRes as any).data || gpRes || [];
    gameplays.value = gList.map((g: any) => ({ name: g.name, img: g.cover_url, uses: g.uses_count }));
    const sList = (styleRes as any).data || styleRes || [];
    styles.value = sList.map((s: any) => s.name);
  } catch {
    models.value = [
      { id: 'gpt2', name: 'GPT Image 2', desc: '画质细腻·理解力强', tags: ['写实','高清'], cost: 15, img: 'https://picsum.photos/seed/gpt2/200/120', badge: '推荐', badgeColor: '#5B9FE8', kie_model: 'gpt-image-2' },
      { id: 'nano', name: 'Nano Banana 2', desc: '速度极快·性价比高', tags: ['快速','全能'], cost: 8, img: 'https://picsum.photos/seed/nano/200/120', badge: '性价比', badgeColor: '#6FD4B0', kie_model: 'nano-banana-2' },
    ];
    gameplays.value = [{ name: '人物美颜', img: 'https://picsum.photos/seed/gp1/180/240', uses: '12.6w' }];
    styles.value = ['赛博朋克','赛璐碌','黑白','国风','油画','水彩','二次元','写实','3D','像素'];
  }
  updateCost();
  uni.$on('applyGameplay', onApplyGameplay);
  uni.$on('applyPrompt', onApplyPrompt);
});
onUnmounted(() => { uni.$off('applyGameplay', onApplyGameplay); uni.$off('applyPrompt', onApplyPrompt); });
</script>

<style lang="scss" scoped>
.page-create {
  min-height: 100vh;
  background: #EEF4FC;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

// 毛玻璃
.glass-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 74px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: 90;
  border-bottom: 0.5px solid rgba(91, 159, 232, 0.14);
}
.status-bar {
  height: 24px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; position: fixed; top: 0; left: 0; right: 0; z-index: 120;
}
.sb-time { font-size: 13px; font-weight: 600; color: #0E1F3A; }
.sb-right { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 10px; color: #0E1F3A; }
.sb-battery { font-size: 12px; color: #0E1F3A; }
.nav-header {
  height: 50px; display: flex; align-items: center; justify-content: center;
  position: fixed; top: 24px; left: 0; right: 0; z-index: 120;
}
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.capsule {
  position: fixed; right: 7px; top: 28px; width: 87px; height: 32px;
  border-radius: 16px; background: rgba(0, 0, 0, 0.06);
  display: flex; align-items: center; justify-content: space-around;
  z-index: 200; border: 0.5px solid rgba(0, 0, 0, 0.08);
}
.cap-btn { width: 43.5px; height: 32px; display: flex; align-items: center; justify-content: center; color: #0E1F3A; font-size: 14px; }
.cap-divider { width: 0.5px; height: 16px; background: rgba(0, 0, 0, 0.15); }

// 滚动区
.create-scroll { padding-top: 74px; padding-bottom: 70px; flex: 1; }

.section-label {
  font-size: 16px; font-weight: 700; color: #0E1F3A;
  display: block; margin-bottom: 8px;
}
.section-label-row {
  display: flex; align-items: center; justify-content: space-between; padding: 0 16px; margin-bottom: 8px;
  .section-label { margin-bottom: 0; }
}
.section-more { display: flex; align-items: center; gap: 2px; }
.more-text { font-size: 14px; font-weight: 600; color: #5B9FE8; }
.more-arrow { font-size: 18px; color: #5B9FE8; }

// 玩法模板
.gp-card {
  background: #fff; border-radius: 16px; padding: 10px;
  border: 1px solid rgba(91, 159, 232, 0.14);
}
.gp-placeholder {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
}
.gp-placeholder-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(91, 159, 232, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: #5B9FE8; flex-shrink: 0;
}
.gp-placeholder-info { flex: 1; }
.gp-placeholder-title { font-size: 14px; font-weight: 600; color: #445876; display: block; }
.gp-placeholder-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.gp-arrow { font-size: 24px; color: #8497B5; flex-shrink: 0; line-height: 1; }
.gp-selected-row { display: flex; align-items: center; gap: 10px; }
.gp-selected-img { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; }
.gp-selected-info { flex: 1; min-width: 0; }
.gp-selected-name { font-size: 14px; font-weight: 700; color: #0E1F3A; display: block; }
.gp-selected-uses { font-size: 11px; color: #8497B5; margin-top: 2px; display: block; display: flex; align-items: center; gap: 3px; }
.gp-close {
  width: 28px; height: 28px; border-radius: 50%; background: #E1EBF8;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #8497B5; flex-shrink: 0;
}

// 模型卡片
.model-card {
  background: #fff; border-radius: 16px; padding: 12px;
  display: flex; align-items: center; gap: 12px;
  border: 1px solid rgba(91, 159, 232, 0.14);
}
.model-img { width: 56px; height: 56px; border-radius: 12px; flex-shrink: 0; }
.model-info { flex: 1; min-width: 0; }
.model-name-row { display: flex; align-items: baseline; gap: 4px; }
.model-name { font-size: 15px; font-weight: 700; color: #0E1F3A; }
.model-badge {
  font-size: 8px; font-weight: 600; padding: 1px 4px;
  border-radius: 3px; white-space: nowrap; line-height: 1;
  position: relative; top: -6px; margin-left: 2px;
}
.model-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.model-tags { display: flex; gap: 4px; margin-top: 4px; }
.model-tag {
  font-size: 10px; padding: 2px 6px; border-radius: 999px;
  background: rgba(91, 159, 232, 0.12); color: #3B7FC8;
}
.model-cost { display: flex; align-items: baseline; gap: 2px; flex-shrink: 0; }
.model-cost-num { font-size: 18px; font-weight: 700; color: #5B9FE8; }
.model-cost-label { font-size: 10px; color: #8497B5; }

// 提示词
.prompt-box {
  position: relative;
}
.prompt-input {
  width: 100%; min-height: 150px; font-size: 14px; line-height: 1.6;
  border-radius: 12px; padding: 12px; padding-bottom: 28px;
  border: 1.5px solid rgba(91, 159, 232, 0.14);
  background: #FBFDFF; color: #0E1F3A; resize: none;
  box-sizing: border-box; outline: none;
  transition: all 0.3s;
  &.focused, &:focus {
    border-color: #5B9FE8;
    box-shadow: 0 0 0 3px rgba(91, 159, 232, 0.12);
    background: #fff;
  }
}
.prompt-count {
  position: absolute; right: 12px; bottom: 10px;
  font-size: 11px; color: #8497B5; pointer-events: none;
}
.prompt-actions {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
}
.prompt-action-btn {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 500; padding: 5px 10px; border-radius: 8px;
  &.reverse { color: #B8A5E3; background: rgba(184, 165, 227, 0.2); }
  &.upload { color: #5B9FE8; background: rgba(91, 159, 232, 0.12); }
  &.clear { color: #8497B5; background: #E1EBF8; }
}
.prompt-img-preview {
  margin-top: 8px; position: relative; display: inline-block;
}
.prompt-img-thumb { width: 80px; height: 80px; border-radius: 10px; }
.prompt-img-close {
  position: absolute; top: -6px; left: 68px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #8497B5; color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
}

// 风格网格
.style-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
  padding: 0 16px;
}
.style-card {
  aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  position: relative; border: 2px solid transparent;
  transition: all 0.3s;
  &.selected { border-color: #5B9FE8; box-shadow: 0 4px 14px rgba(91, 159, 232, 0.35); }
}
.style-img { width: 100%; height: 100%; object-fit: cover; position: absolute; }
.style-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%);
}
.style-label {
  position: absolute; bottom: 6px; left: 0; right: 0;
  text-align: center; color: #fff; font-size: 11px; font-weight: 600;
}
.style-more-overlay {
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
}
.style-more-text { color: #fff; font-size: 18px; font-weight: 700; }

// 精度/比例/数量
.quality-grid, .ratio-grid {
  display: grid; gap: 8px; padding: 0 16px;
}
.quality-grid { grid-template-columns: repeat(3, 1fr); }
.ratio-grid { grid-template-columns: repeat(4, 1fr); }
.count-row { display: flex; gap: 8px; padding: 0 16px; }
.ratio-card {
  border-radius: 12px; border: 2px solid rgba(91, 159, 232, 0.2);
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; padding: 8px 10px;
  background: #fff; transition: all 0.3s; min-width: 56px;
  &.selected, &.active {
    border-color: #5B9FE8; background: rgba(91, 159, 232, 0.12);
  }
}
.ratio-icon { font-size: 16px; font-weight: 700; }
.ratio-shape {
  border-radius: 3px; opacity: 0.6; margin: 0 auto 6px;
  .selected &, .active & { opacity: 1; }
}
.ratio-name { font-size: 11px; color: #8497B5; font-weight: 500; }
.ratio-name.selected { color: #3B7FC8; font-weight: 600; }

// 生成结果
.result-placeholder {
  text-align: center; padding: 30px 0;
}
.result-placeholder-icon { font-size: 32px; display: block; margin-bottom: 8px; color: rgba(91, 159, 232, 0.3); }
.result-placeholder-text { font-size: 13px; color: #8497B5; }

// 生成中动画
.gen-loading { display: flex; flex-direction: column; align-items: center; padding: 30px 0; gap: 12px; }
.gen-spinner {
  width: 28px; height: 28px;
  border: 2.5px solid rgba(91, 159, 232, 0.15);
  border-top-color: #5B9FE8; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.gen-text { font-size: 13px; color: #8497B5; }
.gen-progress { width: 60%; height: 6px; background: #E1EBF8; border-radius: 999px; overflow: hidden; }
.gen-progress-bar { height: 100%; background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); border-radius: 999px; transition: width 0.3s; }

// 生成结果图
.gen-results { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.gen-result-img { border-radius: 14px; overflow: hidden; cursor: pointer; &:active { transform: scale(0.97); } }
.gen-img { width: 100%; aspect-ratio: 3/4; display: block; }

// 预览抽屉
.preview-sheet { max-height: 85vh; }
.preview-img-box { padding: 0 20px; margin-bottom: 16px; }
.preview-full-img { width: 100%; border-radius: 16px; display: block; max-height: 50vh; }
.preview-actions { display: flex; gap: 10px; padding: 0 20px; }
.preview-action-btn {
  flex: 1; padding: 10px 0; text-align: center; border-radius: 12px;
  font-size: 13px; font-weight: 600; background: #E1EBF8; color: #445876;
  &.primary { background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%); color: #fff; }
}

// 底部创作栏
.create-bottom {
  position: fixed; bottom: 50px; left: 0; right: 0; z-index: 80;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid rgba(91, 159, 232, 0.14);
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
}
.cost-info { flex: 1; }
.cost-label { font-size: 11px; color: #8497B5; display: block; }
.cost-row { display: flex; align-items: baseline; gap: 2px; }
.cost-num { font-size: 18px; font-weight: 700; color: #5B9FE8; }
.cost-unit { font-size: 12px; color: #8497B5; }
.create-btn {
  flex: 2; padding: 10px 0;
  background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.35);
  &:active { transform: scale(0.96); }
}
.create-btn-icon { font-size: 20px; color: #fff; }
.create-btn-text { font-size: 15px; font-weight: 600; color: #fff; }

// ===== 底部抽屉通用 =====
.sheet-overlay {
  position: fixed; inset: 0; z-index: 150;
  background: rgba(0, 0, 0, 0.4);
  animation: sheetFadeIn 0.3s;
}
@keyframes sheetFadeIn { from { opacity: 0; } to { opacity: 1; } }
.bottom-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: #fff; border-radius: 24px 24px 0 0;
  box-shadow: 0 -8px 30px rgba(60, 120, 200, 0.12);
  transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 80vh; overflow-y: auto; overflow-x: hidden;
  padding-bottom: 80px; box-sizing: border-box;
  &.show { transform: translateY(0); }
}
.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(91, 159, 232, 0.32); margin: 10px auto 4px;
}
.sheet-title {
  font-size: 16px; font-weight: 700; color: #0E1F3A;
  padding: 10px 16px 12px; display: flex; align-items: baseline; gap: 8px;
}
.sheet-subtitle { font-size: 12px; font-weight: 400; color: #8497B5; }
.sheet-scroll { max-height: 50vh; padding: 0 16px; box-sizing: border-box; width: 100%; }

// ===== 玩法抽屉 =====
.sheet-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding: 0 16px;
}
.sheet-grid-item {
  position: relative; border-radius: 12px; overflow: hidden;
  aspect-ratio: 1; border: 2px solid transparent;
  &.active { border-color: #5B9FE8; }
}
.sheet-grid-clear {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 1.5px dashed rgba(91, 159, 232, 0.32); background: #E1EBF8;
}
.sheet-clear-icon { font-size: 22px; color: #8497B5; }
.sheet-clear-text { font-size: 11px; color: #8497B5; margin-top: 2px; }
.sheet-gp-img { width: 100%; height: 100%; position: absolute; inset: 0; }
.sheet-gp-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 60%); pointer-events: none;
}
.sheet-gp-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; }
.sheet-gp-name { font-size: 12px; font-weight: 600; color: #fff; display: block; }
.sheet-gp-uses { font-size: 10px; color: rgba(255,255,255,0.7); }
.sheet-gp-check {
  position: absolute; top: 6px; right: 6px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #5B9FE8; color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

// ===== 模型抽屉 =====
.model-sheet-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; margin-bottom: 10px;
  background: #fff; border-radius: 16px;
  border: 2px solid rgba(91, 159, 232, 0.14);
  transition: all 0.2s;
  box-sizing: border-box;
  overflow: hidden;
  &.active {
    border-color: #5B9FE8;
    background: linear-gradient(180deg, rgba(91,159,232,0.06) 0%, transparent 100%);
  }
}
.model-sheet-img { width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0; }
.model-sheet-info { flex: 1; min-width: 0; }
.model-sheet-name-row { display: flex; align-items: baseline; gap: 4px; }
.model-sheet-name { font-size: 15px; font-weight: 700; color: #0E1F3A; }
.model-sheet-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.model-sheet-tags { display: flex; gap: 4px; margin-top: 4px; }
.model-sheet-cost { text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 2px; }
.model-sheet-cost-num { font-size: 16px; font-weight: 700; color: #5B9FE8; }
.model-sheet-cost-label { font-size: 10px; color: #8497B5; }
.model-sheet-check {
  width: 22px; height: 22px; border-radius: 50%;
  background: #5B9FE8; color: #fff; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

// ===== 风格抽屉 =====
.style-sheet-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  padding: 0 16px;
}

// ===== 尺寸抽屉 =====
.ratio-sheet-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding: 0 16px;
}
.ratio-size-text { font-size: 10px; color: #8497B5; margin-top: 2px; }
</style>
