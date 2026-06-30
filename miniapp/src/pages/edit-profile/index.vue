<template>
  <view class="sub-page">
    <view class="glass-header" />
    <view class="sub-nav">
      <view class="nav-back" @click="goBack"><text class="back-arrow">‹</text></view>
      <text class="nav-title">编辑资料</text>
      <view style="width:40px;" />
    </view>
    <view class="form-body">
      <view class="avatar-section">
        <view class="avatar-wrap" @click="changeAvatar">
          <view class="avatar"><text class="avatar-text">梦</text></view>
          <view class="avatar-camera">📷</view>
        </view>
        <text class="avatar-hint">点击更换头像</text>
      </view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <view :class="['input-card', { focused: nickFocused }]">
          <input class="form-input" v-model="nickname" maxlength="20" placeholder="请输入昵称" @focus="nickFocused = true" @blur="nickFocused = false" />
        </view>
        <text class="form-count">{{ nickname.length }}/20</text>
      </view>
      <view class="form-group">
        <text class="form-label">性别</text>
        <view class="gender-row">
          <view :class="['gender-btn', { active: gender === 'male' }]" @click="gender = 'male'">男</view>
          <view :class="['gender-btn', { active: gender === 'female' }]" @click="gender = 'female'">女</view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">个性签名</text>
        <view :class="['input-card', { focused: sigFocused }]">
          <textarea class="form-textarea" v-model="signature" maxlength="100" placeholder="写一句个性签名吧" @focus="sigFocused = true" @blur="sigFocused = false" />
        </view>
        <text class="form-count">{{ signature.length }}/100</text>
      </view>
      <view class="form-group">
        <text class="form-label">账号ID</text>
        <view class="input-card disabled">
          <input class="form-input" value="LUMI8829" disabled />
          <text class="lock-icon">🔒</text>
        </view>
        <text class="form-hint">账号ID不可修改</text>
      </view>
      <view class="save-btn" @click="save">保存</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const nickname = ref('云端造梦师');
const gender = ref('male');
const signature = ref('用AI描绘心中的梦境，每一笔都是想象力的延伸');
const nickFocused = ref(false);
const sigFocused = ref(false);
const changeAvatar = () => uni.showToast({ title: '选择头像图片', icon: 'none' });
const save = () => { uni.showToast({ title: '资料已保存', icon: 'success' }); setTimeout(() => uni.navigateBack(), 1000); };
const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.sub-page { min-height: 100vh; background: #EEF4FC; position: relative; }
.glass-header { position: fixed; top: 0; left: 0; right: 0; height: 74px; background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); z-index: 90; border-bottom: 0.5px solid rgba(91,159,232,0.14); }
.sub-nav { display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px; padding-top: 24px; position: fixed; top: 0; left: 0; right: 0; z-index: 120; }
.nav-back { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 28px; color: #0E1F3A; font-weight: 300; }
.nav-title { font-size: 17px; font-weight: 600; color: #0E1F3A; }
.form-body { padding: 98px 16px 16px; }

// 头像
.avatar-section { text-align: center; margin-bottom: 24px; }
.avatar-wrap { position: relative; display: inline-block; cursor: pointer; }
.avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg,#B8A5E3,#5B9FE8,#6FD4B0); display: flex; align-items: center; justify-content: center; }
.avatar-text { font-size: 32px; color: #fff; font-weight: 700; }
.avatar-camera { position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 50%; background: #5B9FE8; border: 2px solid #EEF4FC; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.avatar-hint { font-size: 12px; color: #8497B5; margin-top: 6px; display: block; }

// 表单
.form-group { margin-bottom: 20px; }
.form-label { font-size: 13px; font-weight: 600; color: #445876; margin-bottom: 6px; display: block; }

// 输入框卡片包裹
.input-card {
  background: #fff; border-radius: 12px; border: 1.5px solid rgba(91,159,232,0.14);
  display: flex; align-items: center; overflow: hidden;
  transition: all 0.3s;
  &.focused { border-color: #5B9FE8; box-shadow: 0 0 0 3px rgba(91,159,232,0.12); background: #fff; }
  &.disabled { opacity: 0.6; cursor: not-allowed; }
}
.form-input {
  flex: 1; height: 44px; padding: 0 14px;
  background: none; font-size: 14px; color: #0E1F3A;
  border: none; outline: none;
}
.form-textarea {
  flex: 1; min-height: 80px; padding: 12px 14px;
  background: none; font-size: 14px; color: #0E1F3A;
  resize: none; line-height: 1.6; border: none; outline: none;
}
.form-count { text-align: right; font-size: 11px; color: #8497B5; margin-top: 4px; display: block; }
.form-hint { font-size: 11px; color: #8497B5; margin-top: 4px; display: block; }
.lock-icon { font-size: 16px; color: #8497B5; flex-shrink: 0; padding-right: 14px; }

// 性别
.gender-row { display: flex; gap: 10px; }
.gender-btn {
  flex: 1; padding: 8px 0; text-align: center; border-radius: 10px;
  font-size: 13px; font-weight: 600; border: 2px solid rgba(91,159,232,0.2);
  background: #FBFDFF; color: #445876; transition: all 0.3s;
  &.active { border-color: #5B9FE8; background: rgba(91,159,232,0.12); color: #3B7FC8; }
}

// 保存
.save-btn {
  width: 100%; padding: 14px 0; text-align: center;
  background: #5B9FE8; color: #fff; font-size: 15px; font-weight: 600;
  border-radius: 14px; margin-top: 8px;
  box-shadow: 0 4px 14px rgba(91,159,232,0.35);
  &:active { transform: scale(0.97); }
}
</style>
