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
        <view :class="['gp-card', { selected: selectedGameplay >= 0 }]" @click="openGameplayDrawer">
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
              <text class="gp-selected-uses">🔥 {{ gameplays[selectedGameplay].uses }}人用过</text>
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
              class="prompt-input"
              v-model="prompt"
              placeholder="描述你想要生成图片，越详细效果越好..."
              :maxlength="500"
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
            <image :src="promptImg" mode="aspectFill" class="prompt-img-thumb" />
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
        <view class="result-placeholder">
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// 模型数据
const models = [
  { id: 'gpt2', name: 'GPT Image 2', desc: '画质细腻·理解力强', tags: ['写实', '高清'], cost: 15, img: 'https://picsum.photos/seed/gpt2/200/120', badge: '推荐', badgeColor: '#5B9FE8' },
  { id: 'nano', name: 'Nano Banana 2', desc: '速度极快·性价比高', tags: ['快速', '全能'], cost: 8, img: 'https://picsum.photos/seed/nano/200/120', badge: '性价比', badgeColor: '#6FD4B0' },
  { id: 'flux', name: 'Flux Pro', desc: '艺术感强·细节丰富', tags: ['艺术', '创意'], cost: 12, img: 'https://picsum.photos/seed/flux/200/120', badge: 'NEW', badgeColor: '#FFA8B8' },
  { id: 'sdxl', name: 'SDXL', desc: '开源之王·风格多样', tags: ['多样', '自定义'], cost: 6, img: 'https://picsum.photos/seed/sdxl/200/120', badge: '性价比', badgeColor: '#6FD4B0' },
  { id: 'dalle3', name: 'DALL-E 3', desc: '语义理解·精准还原', tags: ['精准', '还原'], cost: 14, img: 'https://picsum.photos/seed/dalle/200/120', badge: '', badgeColor: '' },
  { id: 'mj', name: 'Midjourney', desc: '艺术天花板·极致美学', tags: ['美学', '艺术'], cost: 20, img: 'https://picsum.photos/seed/mj/200/120', badge: '推荐', badgeColor: '#5B9FE8' },
];

const gameplays = [
  { name: '人物美颜', img: 'https://picsum.photos/seed/gp1/180/240', uses: '12.6w' },
  { name: '证件照', img: 'https://picsum.photos/seed/gp2/180/240', uses: '8.3w' },
  { name: '宠物头像', img: 'https://picsum.photos/seed/gp3/180/240', uses: '5.1w' },
  { name: '古风国潮', img: 'https://picsum.photos/seed/gp4/180/240', uses: '4.8w' },
  { name: 'Q版头像', img: 'https://picsum.photos/seed/gp5/180/240', uses: '6.2w' },
  { name: 'Logo设计', img: 'https://picsum.photos/seed/gp6/180/240', uses: '3.9w' },
  { name: '壁纸', img: 'https://picsum.photos/seed/gp7/180/240', uses: '7.5w' },
  { name: '表情包', img: 'https://picsum.photos/seed/gp8/180/240', uses: '9.0w' },
];

const styles = ['赛博朋克', '赛璐碌', '黑白', '国风', '油画', '水彩', '二次元', '写实', '3D', '像素', '蒸汽波', '极简', '梦幻', '暗黑', '复古'];
const visibleStyles = computed(() => styles.slice(0, 7));
const getStyleImg = (s: string) => `https://picsum.photos/seed/${encodeURIComponent(s)}/100/100`;

const qualities = [
  { label: '全高清1K', icon: 'HD' },
  { label: '超清2K', icon: '2K' },
  { label: '超高清4K', icon: '4K' },
];
const ratios = [
  { label: '1:1' }, { label: '3:4' }, { label: '4:3' }, { label: '16:9' }, { label: '9:16' },
];
const counts = [1, 2, 3, 4];

// 状态
const selectedModel = ref(0);
const selectedGameplay = ref(-1);
const selectedStyle = ref<string | null>(null);
const selectedQuality = ref(0);
const selectedRatio = ref(0);
const selectedCount = ref(0);
const prompt = ref('');
const promptImg = ref('');
const scrollH = ref(600);

const currentModel = computed(() => models[selectedModel.value]);
const isMoreStyleSelected = computed(() => selectedStyle.value ? styles.indexOf(selectedStyle.value) > 6 : false);
const totalCost = ref(currentModel.value.cost);

const ratioShape = (label: string) => {
  switch (label) {
    case '1:1': return { w: 28, h: 28 };
    case '3:4': return { w: 24, h: 32 };
    case '4:3': return { w: 36, h: 27 };
    case '16:9': return { w: 36, h: 20 };
    case '9:16': return { w: 20, h: 36 };
    default: return { w: 28, h: 28 };
  }
};

const updateCost = () => {
  totalCost.value = currentModel.value.cost * counts[selectedCount.value];
};

const selectStyle = (s: string) => { selectedStyle.value = s; };
const clearGameplay = () => {
  selectedGameplay.value = -1;
  uni.showToast({ title: '已取消玩法模板', icon: 'none' });
};
const clearPrompt = () => { prompt.value = ''; };
const uploadImg = () => {
  promptImg.value = `https://picsum.photos/seed/upload${Date.now()}/200/200`;
  uni.showToast({ title: '图片已上传', icon: 'none' });
};
const goReversePrompt = () => uni.showToast({ title: '反推提示词页开发中', icon: 'none' });
const openModelDrawer = () => uni.showToast({ title: '模型选择抽屉开发中', icon: 'none' });
const openGameplayDrawer = () => uni.showToast({ title: '玩法选择抽屉开发中', icon: 'none' });
const openAllStyles = () => uni.showToast({ title: '全部风格弹窗开发中', icon: 'none' });
const openRatioSheet = () => uni.showToast({ title: '全部尺寸弹窗开发中', icon: 'none' });
const startCreate = () => uni.showToast({ title: '开始创作！消耗' + totalCost.value + '积分', icon: 'none' });

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  scrollH.value = sys.windowHeight - 80; // 减去tabbar
  updateCost();
});
</script>

<style lang="scss" scoped>
.page-create {
  min-height: 100vh;
  background: #EEF4FC;
  position: relative;
  display: flex;
  flex-direction: column;
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
.create-scroll { padding-top: 74px; flex: 1; }

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
  border: 1.5px dashed rgba(91, 159, 232, 0.32);
  &.selected { border: 1.5px solid #5B9FE8; background: linear-gradient(180deg, rgba(91,159,232,0.06) 0%, transparent 100%); }
}
.gp-placeholder {
  display: flex; align-items: center; gap: 10px;
}
.gp-placeholder-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(91, 159, 232, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: #5B9FE8; flex-shrink: 0;
}
.gp-placeholder-title { font-size: 14px; font-weight: 600; color: #445876; display: block; }
.gp-placeholder-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.gp-arrow { font-size: 20px; color: #8497B5; flex-shrink: 0; }
.gp-selected-row { display: flex; align-items: center; gap: 10px; }
.gp-selected-img { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; }
.gp-selected-name { font-size: 14px; font-weight: 700; color: #0E1F3A; display: block; }
.gp-selected-uses { font-size: 11px; color: #8497B5; margin-top: 2px; display: block; }
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
}
.model-desc { font-size: 12px; color: #8497B5; margin-top: 2px; display: block; }
.model-tags { display: flex; gap: 4px; margin-top: 4px; }
.model-tag {
  font-size: 10px; padding: 2px 6px; border-radius: 999px;
  background: rgba(91, 159, 232, 0.12); color: #3B7PC8;
}
.model-cost { text-align: right; flex-shrink: 0; }
.model-cost-num { font-size: 18px; font-weight: 700; color: #5B9FE8; display: block; }
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
  box-sizing: border-box;
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
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
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
.ratio-name.selected { color: #3B7PC8; font-weight: 600; }

// 生成结果
.result-placeholder {
  text-align: center; padding: 30px 0;
}
.result-placeholder-icon { font-size: 32px; display: block; margin-bottom: 8px; color: rgba(91, 159, 232, 0.3); }
.result-placeholder-text { font-size: 13px; color: #8497B5; }

// 底部创作栏
.create-bottom {
  padding: 12px 16px 10px;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid rgba(91, 159, 232, 0.14);
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
  box-shadow: 0 -4px 20px rgba(60, 120, 200, 0.06);
}
.cost-info { flex: 1; }
.cost-label { font-size: 11px; color: #8497B5; display: block; }
.cost-row { display: flex; align-items: baseline; gap: 2px; }
.cost-num { font-size: 18px; font-weight: 700; color: #5B9FE8; }
.cost-unit { font-size: 12px; color: #8497B5; }
.create-btn {
  flex: 2; padding: 12px 0;
  background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  box-shadow: 0 4px 14px rgba(91, 159, 232, 0.35);
  &:active { transform: scale(0.96); }
}
.create-btn-icon { font-size: 20px; color: #fff; }
.create-btn-text { font-size: 15px; font-weight: 600; color: #fff; }
</style>
