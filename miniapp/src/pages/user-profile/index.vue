<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">用户主页</text>
      <view style="width:40px;" />
    </view>
    <scroll-view scroll-y class="profile-scroll" :style="{ height: scrollH + 'px' }">
      <!-- 头像 + 信息 -->
      <view class="profile-header">
        <view class="user-row">
          <view class="user-avatar" :style="{ background: user.color }">
            <text class="user-avatar-text">{{ user.avatar }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-id">ID: LUMI{{ user.id }}</text>
            <view class="gender-row">
              <text :class="['gender-tag', user.gender === 'female' ? 'female' : 'male']">{{ user.gender === 'female' ? '♀' : '♂' }}</text>
            </view>
          </view>
        </view>

        <!-- 签名 -->
        <text class="user-bio">{{ user.bio }}</text>

        <!-- 数据统计 + 关注按钮 -->
        <view class="stats-follow-row">
          <view class="stats-list">
            <view class="stat-item">
              <text class="stat-num" style="color:#FFA8B8;">{{ user.works }}</text>
              <text class="stat-label">作品</text>
            </view>
            <view class="stat-item">
              <text class="stat-num" style="color:#5B9FE8;">{{ user.followers }}</text>
              <text class="stat-label">粉丝</text>
            </view>
            <view class="stat-item">
              <text class="stat-num" style="color:#B8A5E3;">{{ user.likes }}</text>
              <text class="stat-label">获赞</text>
            </view>
          </view>
          <view :class="['follow-btn', { followed: following }]" @click="toggleFollow">{{ following ? '已关注' : '+ 关注' }}</view>
        </view>
      </view>

      <!-- TA的作品标题 -->
      <view class="works-header">
        <text class="works-title">TA的作品 ({{ works.length }})</text>
      </view>

      <!-- 瀑布流 -->
      <view class="waterfall-wrap">
        <view class="waterfall">
          <view v-for="w in leftCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view class="wf-card">
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar-sm" :style="{ background: user.color }"><text class="wf-avatar-sm-text">{{ user.avatar }}</text></view>
                    <text class="wf-author-name">{{ user.name }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text class="wf-like-icon" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="waterfall">
          <view v-for="w in rightCol" :key="w.id" class="wf-item" @click="goWorkDetail(w)">
            <view class="wf-card">
              <view class="wf-img-wrap">
                <image :src="w.img" mode="widthFix" class="wf-img" />
              </view>
              <view class="wf-info">
                <text class="wf-title">{{ w.title }}</text>
                <view class="wf-meta">
                  <view class="wf-author">
                    <view class="wf-avatar-sm" :style="{ background: user.color }"><text class="wf-avatar-sm-text">{{ user.avatar }}</text></view>
                    <text class="wf-author-name">{{ user.name }}</text>
                  </view>
                  <view class="wf-like" @click.stop="toggleLike(w)">
                    <text class="wf-like-icon" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.liked ? '♥' : '♡' }}</text>
                    <text class="wf-like-num" :style="{ color: w.liked ? '#FFA8B8' : '#8497B5' }">{{ w.likes }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
const scrollH = ref(700);
const following = ref(false);
const showUnfollowDialog = ref(false);

const user = {
  id: 2, name: '星辰大海', avatar: '星', color: '#6FD4B0',
  bio: '探索AI的无限可能', gender: 'male',
  works: 36, followers: 215, likes: 890,
};

const works = ref([
  { id: 1, img: 'https://picsum.photos/seed/w1/300/420', title: '霓虹都市', likes: 328, liked: false },
  { id: 6, img: 'https://picsum.photos/seed/w6/300/225', title: '赛博精灵', likes: 445, liked: false },
  { id: 9, img: 'https://picsum.photos/seed/w9/300/530', title: '暗黑天使', likes: 723, liked: false },
  { id: 10, img: 'https://picsum.photos/seed/w10/300/225', title: '蒸汽城市', likes: 356, liked: false },
]);

const leftCol = computed(() => works.value.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => works.value.filter((_, i) => i % 2 === 1));

const toggleFollow = () => {
  if (following.value) {
    showUnfollowDialog.value = true;
  } else {
    following.value = true;
    uni.showToast({ title: '关注成功', icon: 'none' });
  }
};
const confirmUnfollow = () => {
  following.value = false;
  showUnfollowDialog.value = false;
  uni.showToast({ title: '已取消关注', icon: 'none' });
};
const toggleLike = (w: any) => {
  w.liked = !w.liked;
  w.likes += w.liked ? 1 : -1;
};
const goWorkDetail = (w: any) => uni.navigateTo({ url: '/pages/work-detail/index' });
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
.profile-scroll { padding-top: 74px; }

// 头部
.profile-header { padding-bottom: 8px; }
.user-row { display: flex; align-items: flex-start; gap: 14px; padding: 16px 16px 0; }
.user-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-avatar-text { font-size: 28px; color: #fff; font-weight: 700; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 18px; font-weight: 700; color: #0E1F3A; display: block; }
.user-id { font-size: 13px; color: #8497B5; margin-top: 3px; display: block; }
.gender-row { margin-top: 2px; }
.gender-tag {
  padding: 2px 8px; border-radius: 999px; font-size: 12px; display: inline-block;
  &.female { background: rgba(255,168,184,0.22); color: #FFA8B8; }
  &.male { background: rgba(91,159,232,0.12); color: #5B9FE8; }
}
.user-bio { padding: 10px 16px 0; font-size: 14px; color: #445876; line-height: 1.5; display: block; }

// 统计 + 关注按钮
.stats-follow-row { display: flex; align-items: center; padding: 16px 16px 8px; }
.stats-list { flex: 1; display: flex; gap: 28px; }
.stat-item { text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; }
.stat-label { font-size: 13px; color: #8497B5; margin-left: 4px; }
.follow-btn {
  padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600;
  background: #5B9FE8; color: #fff; flex-shrink: 0;
  &.followed { background: #E1EBF8; color: #8497B5; }
}

// TA的作品标题
.works-header { padding: 12px 16px 6px; display: flex; align-items: center; justify-content: space-between; }
.works-title { font-size: 14px; font-weight: 600; color: #0E1F3A; }

// 瀑布流
.waterfall-wrap { padding: 0 12px; display: flex; gap: 8px; }
.waterfall { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.wf-card {
  background: #fff; border: 1px solid rgba(91,159,232,0.14); border-radius: 20px; overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
}
.wf-img-wrap { width: 100%; overflow: hidden; cursor: pointer; &:active { transform: scale(0.97); } }
.wf-img { width: 100%; display: block; }
.wf-info { padding: 8px 10px 6px; }
.wf-title { font-size: 13px; font-weight: 600; color: #0E1F3A; display: block; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-meta { display: flex; align-items: center; justify-content: space-between; }
.wf-author { display: flex; align-items: center; gap: 5px; flex: 1; overflow: hidden; }
.wf-avatar-sm { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wf-avatar-sm-text { font-size: 10px; color: #fff; font-weight: 700; }
.wf-author-name { font-size: 11px; color: #445876; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-like { display: flex; align-items: center; gap: 3px; flex-shrink: 0; padding: 2px 4px; border-radius: 8px; }
.wf-like-icon { font-size: 16px; transition: all 0.3s; }
.wf-like-num { font-size: 13px; font-weight: 600; }

// 确认弹窗
.dialog-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  width: 280px; background: #fff; border-radius: 20px;
  padding: 24px 20px 16px; text-align: center;
  box-shadow: 0 24px 56px rgba(60,120,200,0.16);
  animation: dialogIn 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes dialogIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.dialog-icon-wrap {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255,181,154,0.2);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}
.dialog-icon { font-size: 24px; color: #FFB59A; }
.dialog-title { font-size: 17px; font-weight: 700; color: #0E1F3A; display: block; margin-bottom: 8px; }
.dialog-msg { font-size: 14px; color: #445876; display: block; margin-bottom: 20px; }
.dialog-actions { display: flex; gap: 10px; }
.dialog-btn { flex: 1; padding: 10px 0; border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center; }
.dialog-cancel { background: #E1EBF8; color: #445876; }
.dialog-confirm { background: #FFA8B8; color: #fff; }
</style>
