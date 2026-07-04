<script setup lang="ts">
import { computed, ref } from "vue";

const nickname = ref("云端造梦师");
const gender = ref<"male" | "female">("male");
const signature = ref("用AI描绘心中的梦境，每一笔都是想象力的延伸");
const accountId = "LUMI8829";

const nickCount = computed(() => `${nickname.value.length}/20`);
const signCount = computed(() => `${signature.value.length}/100`);

function pickAvatar() {
  uni.showToast({ title: "选择头像图片", icon: "none" });
}

function save() {
  uni.showToast({ title: "资料已保存", icon: "none" });
  setTimeout(() => uni.navigateBack(), 600);
}
</script>

<template>
  <view class="edit-page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="edit-content">
        <view class="avatar-block">
          <view class="avatar-wrap" @click="pickAvatar">
            <view class="avatar">梦</view>
            <view class="avatar-cam">◎</view>
          </view>
          <view class="avatar-tip">点击更换头像</view>
        </view>

        <view class="field">
          <view class="field-label">昵称</view>
          <input class="input" type="text" v-model="nickname" placeholder="请输入昵称" :maxlength="20" />
          <view class="counter">{{ nickCount }}</view>
        </view>

        <view class="field">
          <view class="field-label">性别</view>
          <view class="gender-row">
            <view class="gender-option" :class="{ active: gender === 'male' }" @click="gender = 'male'">男</view>
            <view class="gender-option" :class="{ active: gender === 'female' }" @click="gender = 'female'">女</view>
          </view>
        </view>

        <view class="field">
          <view class="field-label">个性签名</view>
          <textarea class="input textarea" v-model="signature" placeholder="写一句个性签名吧" :maxlength="100" />
          <view class="counter">{{ signCount }}</view>
        </view>

        <view class="field lock-field">
          <view class="field-label">账号ID</view>
          <view class="lock-row">
            <input class="input locked" type="text" :value="accountId" disabled />
            <view class="lock-icon">⚿</view>
          </view>
          <view class="lock-tip">账号ID不可修改</view>
        </view>

        <button class="save-btn" @click="save">保存</button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.edit-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.edit-content {
  padding: 24px 16px 32px;
}

.avatar-block {
  margin-bottom: 24px;
  text-align: center;
}

.avatar-wrap {
  position: relative;
  display: inline-block;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 4px 12px var(--accent-glow);
}

.avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  font-size: 14px;
  color: #fff;
  background: var(--accent);
  border: 2px solid var(--bg-base);
  border-radius: 50%;
}

.avatar-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--fg-muted);
}

.field {
  margin-bottom: 20px;
}

.field-label {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
}

.input {
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  padding: 0 14px;
  font-size: 14px;
  color: var(--fg-primary);
  background: var(--bg-elevated);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
}

.input:focus-within {
  background: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.input.locked:focus-within {
  background: var(--bg-elevated);
  border-color: var(--border);
  box-shadow: none;
}

.textarea {
  height: auto;
  min-height: 72px;
  padding: 10px 14px;
  line-height: 1.6;
}

.counter {
  margin-top: 4px;
  font-size: 11px;
  color: var(--fg-muted);
  text-align: right;
}

.gender-row {
  display: flex;
  gap: 10px;
}

.gender-option {
  flex: 1;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
  text-align: center;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.gender-option.active {
  color: var(--accent-deep);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.lock-field {
  margin-bottom: 28px;
}

.lock-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.lock-row .input {
  flex: 1;
}

.input.locked {
  opacity: 0.6;
}

.lock-icon {
  flex: 0 0 auto;
  font-size: 16px;
  color: var(--fg-muted);
}

.lock-tip {
  margin-top: 4px;
  font-size: 11px;
  color: var(--fg-muted);
}

.save-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  line-height: 48px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 12px;
}

.save-btn::after {
  border: none;
}
</style>
