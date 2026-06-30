<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">作品详情</text>
      <view style="width:40px;" />
    </view>

    <scroll-view scroll-y class="detail-scroll">
      <!-- 作品图片 -->
      <image :src="work.img" mode="aspectFill" class="detail-img" :class="{ loaded: imgLoaded }" @load="imgLoaded = true" @click="onImgClick" @longpress="onImgLongPress" />

      <view class="detail-body">
        <!-- 作者行 -->
        <view class="author-row">
          <view class="author-left" @click="!isOwn && goUserProfile()">
            <view class="author-avatar" :style="{ background: author.color }">
              <text class="author-avatar-text">{{ author.avatar }}</text>
            </view>
            <view class="author-info">
              <text class="author-name">{{ author.name }}</text>
              <text class="author-sub">{{ author.works }}作品 · {{ author.likes }}获赞</text>
            </view>
          </view>
          <!-- 别人的作品：关注按钮 -->
          <view v-if="!isOwn" :class="['follow-btn', { followed: followed }]" @click="toggleFollow">{{ followed ? '已关注' : '+ 关注' }}</view>
          <!-- 自己的作品：管理按钮 -->
          <view v-else class="manage-btn-detail" @click="openManageSheet">⚙ 管理</view>
        </view>

        <!-- 标题 -->
        <text class="detail-title">{{ work.title }}</text>

        <!-- 描述（已发布才显示） -->
        <text v-if="work.desc" class="detail-desc">{{ work.desc }}</text>

        <!-- 标签（已发布才显示） -->
        <view v-if="work.isPublished" class="detail-tags">
          <text class="detail-tag tag-accent">{{ work.model }}</text>
          <text class="detail-tag tag-mint">{{ work.ratio }}</text>
          <text v-if="work.style" class="detail-tag tag-lavender">{{ work.style }}</text>
          <text v-for="t in work.tags" :key="t" class="detail-tag tag-peach">{{ t }}</text>
        </view>

        <!-- 提示词 -->
        <view class="prompt-box">
          <view class="prompt-header">
            <text class="prompt-label">提示词</text>
            <view class="prompt-copy" @click="copyPrompt"><text class="prompt-copy-text">📋 复制</text></view>
          </view>
          <text class="prompt-text">{{ work.prompt }}</text>
        </view>

        <!-- 时间 -->
        <text class="detail-time">生成于 {{ work.time }}</text>

        <!-- 数据统计（已发布才显示） -->
        <view v-if="work.isPublished" class="stats-row">
          <view class="stat-col">
            <text class="stat-num stat-rose">{{ work.likes }}</text>
            <text class="stat-label">点赞</text>
          </view>
          <view class="stat-col">
            <text class="stat-num stat-accent">{{ work.favorites }}</text>
            <text class="stat-label">收藏</text>
          </view>
          <view class="stat-col">
            <text class="stat-num stat-lavender">{{ work.remakes }}</text>
            <text class="stat-label">同款</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ===== 底部操作栏：别人的作品 ===== -->
    <view v-if="!isOwn" class="bottom-bar">
      <view class="bar-action" @click="toggleLike">
        <text class="bar-icon" :class="{ 'icon-bounce': likeBounce }" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ liked ? '♥' : '♡' }}</text>
        <text class="bar-num" :style="{ color: liked ? '#FFA8B8' : '#8497B5' }">{{ work.likes }}</text>
      </view>
      <view class="bar-action" @click="toggleFav">
        <text class="bar-icon" :class="{ 'icon-bounce': favBounce }" :style="{ color: faved ? '#FFE08A' : '#8497B5' }">{{ faved ? '★' : '☆' }}</text>
        <text class="bar-num" :style="{ color: faved ? '#FFE08A' : '#8497B5' }">{{ work.favorites }}</text>
      </view>
      <view class="bar-btn-main" @click="remake">
        <text class="bar-btn-text">✦ 一键同款</text>
      </view>
    </view>

    <!-- ===== 底部操作栏：自己的作品 ===== -->
    <view v-else class="bottom-bar">
      <view class="bar-action-col" @click="deleteWork">
        <text class="bar-action-icon" style="color:#FFA8B8;">🗑</text>
        <text class="bar-action-label" style="color:#FFA8B8;">删除</text>
      </view>
      <view class="bar-action-col" @click="downloadWork">
        <text class="bar-action-icon" style="color:#8497B5;">💾</text>
        <text class="bar-action-label" style="color:#8497B5;">下载</text>
      </view>
      <view class="bar-btn-main" @click="remake">
        <text class="bar-btn-text">↻ 重新生成</text>
      </view>
    </view>

    <!-- 取消关注确认弹窗 -->
    <view v-if="showUnfollowDialog" class="dialog-overlay" @click="showUnfollowDialog = false">
      <view class="dialog-box" @click.stop>
        <view class="dialog-icon-wrap"><text class="dialog-icon">♡</text></view>
        <text class="dialog-title">取消关注</text>
        <text class="dialog-msg">确定要取消关注该用户吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn dialog-cancel" @click="showUnfollowDialog = false">再想想</view>
          <view class="dialog-btn dialog-confirm" @click="confirmUnfollow">取消关注</view>
        </view>
      </view>
    </view>

    <!-- 长按图片抽屉（别人的作品） -->
    <view v-if="showLongPressSheet" class="sheet-overlay" @click="showLongPressSheet = false" />
    <view :class="['long-press-sheet', { show: showLongPressSheet }]">
      <view class="sheet-handle" />
      <view class="lp-row" @click="saveToAlbum">💾 保存到相册</view>
      <view class="lp-row" @click="reportWork">⚠ 举报该作品</view>
      <view class="lp-row cancel" @click="showLongPressSheet = false">取消</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { workApi, getUserDisplay, getUserInfo, isMyWork } from '@/utils/api';

const imgLoaded = ref(false);
const liked = ref(false);
const faved = ref(false);
const followed = ref(false);
const showUnfollowDialog = ref(false);
const likeBounce = ref(false);
const favBounce = ref(false);
const isOwn = ref(false);
const showLongPressSheet = ref(false);

const author = ref({ name: '', avatar: '', color: '#6FD4B0', works: 0, likes: '0' });
const work = ref({
  id: '', img: '', title: '', desc: '', model: '', ratio: '', style: '',
  tags: [] as string[], prompt: '', time: '', likes: 0, favorites: 0, remakes: 0,
  isPublished: false, userId: '',
});

onMounted(async () => {
  const pages = getCurrentPages();
  const curPage = pages[pages.length - 1] as any;
  const options = curPage?.$page?.options || curPage?.options || {};
  const workId = options.id || 'w001';

  try {
    const res = await workApi.getWorkDetail(workId);
    const w = (res.data || res) as any;
    if (w) {
      work.value = {
        id: w.id, img: w.image_urls?.[0] || '', title: w.title || '',
        desc: w.description || '', model: w.model || '', ratio: w.aspect_ratio || '',
        style: w.style || '', tags: w.tags || [], prompt: w.prompt || '',
        time: w.published_at || w.created_at || '',
        likes: w.likes_count || 0, favorites: w.favorites_count || 0, remakes: w.remakes_count || 0,
        isPublished: w.status === 'published', userId: w.user_id,
      };
      isOwn.value = isMyWork(w.user_id);

      const display = getUserDisplay(w.user_id);
      const user = w.user || getUserInfo(w.user_id);
      author.value = {
        name: user?.nickname || '', avatar: display.avatar, color: display.color,
        works: user?.works_count || 0, likes: String(user?.likes_count || 0),
      };
    }
  } catch {}
});

// 图片操作
const onImgClick = () => uni.previewImage({ urls: [work.value.img], current: work.value.img });
const onImgLongPress = () => { if (!isOwn.value) showLongPressSheet.value = true; };

// 点赞/收藏（别人的作品）
const toggleLike = async () => {
  liked.value = !liked.value;
  work.value.likes += liked.value ? 1 : -1;
  if (liked.value) { likeBounce.value = true; setTimeout(() => likeBounce.value = false, 400); }
  try { await workApi.likeWork(work.value.id); } catch {}
};
const toggleFav = async () => {
  faved.value = !faved.value;
  work.value.favorites += faved.value ? 1 : -1;
  if (faved.value) { favBounce.value = true; setTimeout(() => favBounce.value = false, 400); }
  try { await workApi.favoriteWork(work.value.id); } catch {}
};

// 关注
const toggleFollow = () => {
  if (followed.value) { showUnfollowDialog.value = true; }
  else { followed.value = true; uni.showToast({ title: '关注成功', icon: 'none' }); }
};
const confirmUnfollow = () => { followed.value = false; showUnfollowDialog.value = false; uni.showToast({ title: '已取消关注', icon: 'none' }); };

// 一键同款/重新生成
const remake = () => {
  uni.$emit('applyPrompt', work.value.prompt);
  uni.switchTab({ url: '/pages/create/index' });
  uni.showToast({ title: '已带入提示词和参数', icon: 'none' });
};

// 自己作品的操作
const deleteWork = () => { uni.showModal({ title: '确认删除', content: '删除后不可恢复', success: (res) => { if (res.confirm) { uni.showToast({ title: '已删除', icon: 'none' }); setTimeout(() => uni.navigateBack(), 500); } } }); };
const downloadWork = () => { uni.showToast({ title: '已保存到相册', icon: 'none' }); };
const openManageSheet = () => { uni.showToast({ title: '管理功能开发中', icon: 'none' }); };

// 长按操作
const saveToAlbum = () => { showLongPressSheet.value = false; uni.showToast({ title: '已保存到相册', icon: 'none' }); };
const reportWork = () => { showLongPressSheet.value = false; uni.navigateTo({ url: '/pages/report/index' }); };

const copyPrompt = () => { uni.setClipboardData({ data: work.value.prompt }); uni.showToast({ title: '提示词已复制', icon: 'none' }); };
const goBack = () => uni.navigateBack();
const goUserProfile = () => uni.navigateTo({ url: `/pages/user-profile/index?id=${work.value.userId}` });
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; display: flex; flex-direction: column; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }

.detail-scroll { flex: 1; padding-top: 74px; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: 80px; }
.detail-img { width: 100%; height: 400px; display: block; opacity: 0; transition: opacity 0.35s ease; &.loaded { opacity: 1; } }
.detail-body { padding: 16px; }

// 作者行
.author-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.author-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.author-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.author-avatar-text { font-size: 16px; color: #fff; font-weight: 700; }
.author-info { flex: 1; min-width: 0; }
.author-name { font-size: 15px; font-weight: 700; color: #0E1F3A; display: block; }
.author-sub { font-size: 11px; color: #8497B5; }
.follow-btn { padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #5B9FE8; color: #fff; flex-shrink: 0; transition: all 0.3s; &.followed { background: #E1EBF8; color: #8497B5; } }
.manage-btn-detail { padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #E1EBF8; color: #445876; flex-shrink: 0; }

.detail-title { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 8px; }
.detail-desc { font-size: 14px; color: #445876; line-height: 1.5; display: block; margin-bottom: 14px; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.detail-tag { padding: 3px 10px; font-size: 11px; font-weight: 600; border-radius: 999px; }
.tag-accent { background: rgba(91,159,232,0.12); color: #3B7FC8; }
.tag-mint { background: rgba(111,212,176,0.16); color: #6FD4B0; }
.tag-lavender { background: rgba(184,165,227,0.2); color: #8470C7; }
.tag-peach { background: rgba(255,181,154,0.2); color: #E07A5A; }

.prompt-box { background: #fff; border-radius: 20px; padding: 12px; margin-bottom: 14px; border: 1px solid rgba(91,159,232,0.14); }
.prompt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.prompt-label { font-size: 13px; font-weight: 600; color: #8497B5; }
.prompt-copy { padding: 2px 8px; cursor: pointer; }
.prompt-copy-text { font-size: 12px; font-weight: 600; color: #5B9FE8; }
.prompt-text { font-size: 13px; color: #0E1F3A; line-height: 1.6; }
.detail-time { font-size: 12px; color: #8497B5; display: block; margin-bottom: 14px; }

.stats-row { display: flex; gap: 16px; padding: 12px 0; border-top: 0.5px solid rgba(91,159,232,0.14); border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.stat-col { text-align: center; flex: 1; }
.stat-num { font-size: 18px; font-weight: 700; display: block; }
.stat-rose { color: #FFA8B8; }
.stat-accent { color: #5B9FE8; }
.stat-lavender { color: #B8A5E3; }
.stat-label { font-size: 11px; color: #8497B5; margin-top: 2px; }

// 底部操作栏
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px 30px 16px;
  background: rgba(255,255,255,0.72);
  -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid rgba(91,159,232,0.14);
  box-shadow: 0 -4px 20px rgba(60,120,200,0.06); z-index: 80;
}
.bar-action { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.bar-icon { font-size: 28px; transition: all 0.3s; &.icon-bounce { animation: iconBounce 0.4s cubic-bezier(0.34,1.56,0.64,1); } }
@keyframes iconBounce { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
.bar-num { font-size: 14px; font-weight: 600; }
.bar-action-col { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; min-width: 44px; }
.bar-action-icon { font-size: 24px; }
.bar-action-label { font-size: 11px; }
.bar-btn-main {
  flex: 1; margin-left: auto;
  background: linear-gradient(135deg, #5B9FE8 0%, #7BC4F0 45%, #6FD4B0 100%);
  color: #fff; border-radius: 14px; padding: 12px 0; text-align: center;
  box-shadow: 0 4px 14px rgba(91,159,232,0.35);
  &:active { transform: scale(0.96); }
}
.bar-btn-text { font-size: 14px; font-weight: 700; }

// 弹窗
.dialog-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.dialog-box { width: 280px; background: #fff; border-radius: 20px; padding: 24px 20px 16px; text-align: center; box-shadow: 0 24px 56px rgba(60,120,200,0.16); animation: dialogIn 0.25s cubic-bezier(0.16,1,0.3,1); }
@keyframes dialogIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.dialog-icon-wrap { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,181,154,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.dialog-icon { font-size: 24px; color: #FFB59A; }
.dialog-title { font-size: 17px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 8px; }
.dialog-msg { font-size: 14px; color: #445876; display: block; margin-bottom: 20px; }
.dialog-actions { display: flex; gap: 10px; }
.dialog-btn { flex: 1; padding: 10px 0; border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center; }
.dialog-cancel { background: #E1EBF8; color: #445876; }
.dialog-confirm { background: #FFA8B8; color: #fff; }

// 长按抽屉
.sheet-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.4); }
.long-press-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: #fff; border-radius: 24px 24px 0 0; padding-bottom: 30px;
  transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
  &.show { transform: translateY(0); }
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(91,159,232,0.3); margin: 10px auto 8px; }
.lp-row { padding: 14px 20px; font-size: 15px; color: #0E1F3A; text-align: center; &:active { background: rgba(91,159,232,0.05); } &.cancel { color: #8497B5; border-top: 0.5px solid rgba(91,159,232,0.14); margin-top: 4px; } }
</style>
