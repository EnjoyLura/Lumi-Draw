<script setup lang="ts">
interface DrawerAction {
  icon: string;
  label: string;
  url: string;
}

defineProps<{
  open: boolean;
  userName: string;
  userAvatar: string;
  userColor: string;
  quickActions: DrawerAction[];
  rows: DrawerAction[];
}>();

const emit = defineEmits<{
  close: [];
  navigate: [url: string];
}>();
</script>

<template>
  <view class="side-overlay" :class="{ show: open }" @click="emit('close')" />
  <view class="side-drawer" :class="{ show: open }">
    <view class="side-head">
      <view class="side-avatar" :style="{ background: userColor }">{{ userAvatar }}</view>
      <view class="side-info">
        <view class="side-name">{{ userName }}</view>
        <view class="side-sub">露米绘画创作者</view>
      </view>
    </view>
    <view class="side-quick-grid">
      <view v-for="item in quickActions" :key="item.label" class="side-quick" @click="emit('navigate', item.url)">
        <view class="side-quick-icon">{{ item.icon }}</view>
        <text>{{ item.label }}</text>
      </view>
    </view>
    <view class="side-list">
      <view v-for="item in rows" :key="item.label" class="side-row" @click="emit('navigate', item.url)">
        <view class="side-row-icon">{{ item.icon }}</view>
        <text>{{ item.label }}</text>
        <text class="side-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.side-overlay {
  position: absolute;
  inset: 0;
  z-index: 150;
  background: rgba(14, 31, 58, 0.32);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.32s ease,
    visibility 0.32s;
}

.side-overlay.show {
  opacity: 1;
  visibility: visible;
}

.side-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 210;
  width: 78%;
  max-width: 310px;
  padding: 34px 18px 24px;
  box-sizing: border-box;
  background: var(--bg-card);
  border-radius: 0 24px 24px 0;
  box-shadow: 14px 0 40px rgba(14, 31, 58, 0.18);
  transform: translateX(-105%);
  visibility: hidden;
  transition:
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.42s;
}

.side-drawer.show {
  transform: translateX(0);
  visibility: visible;
}

.side-head {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 18px;
  border-bottom: 0.5px solid var(--border);
}

.side-avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.side-info {
  min-width: 0;
}

.side-name {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--fg-muted);
}

.side-quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 18px 0;
}

.side-quick {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 74px;
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-secondary);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.side-quick-icon,
.side-row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 50%;
}

.side-quick-icon {
  width: 30px;
  height: 30px;
  font-size: 15px;
}

.side-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 46px;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.side-row-icon {
  width: 28px;
  height: 28px;
  font-size: 14px;
}

.side-arrow {
  margin-left: auto;
  font-size: 20px;
  color: var(--fg-muted);
}
</style>
