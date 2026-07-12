<script setup lang="ts">
interface DrawerQuickAction {
  icon: string;
  label: string;
  url: string;
  gradient: string;
}

interface DrawerRow {
  icon: string;
  label: string;
  url: string;
  color: string;
  badge?: string;
}

withDefaults(
  defineProps<{
    open: boolean;
    userName: string;
    userAvatar: string;
    userColor: string;
    userPoints?: string;
    quickActions: DrawerQuickAction[];
    rows: DrawerRow[];
  }>(),
  {
    userPoints: "0"
  }
);

const emit = defineEmits<{
  close: [];
  navigate: [url: string];
}>();
</script>

<template>
  <view class="side-overlay" :class="{ show: open }" @click="emit('close')" />
  <view class="side-drawer" :class="{ show: open }">
    <view class="side-head">
      <view class="side-user">
        <view class="side-avatar" :style="{ background: userColor }"><text v-if="userAvatar">{{ userAvatar }}</text><LumiIcon v-else name="user" :size="22" /></view>
        <view class="side-info">
          <view class="side-name">{{ userName }}</view>
          <view class="side-points">
            <LumiIcon class="side-points-icon" name="sparkles-filled" :size="15" />
            <text class="side-points-num">{{ userPoints }}</text>
          </view>
        </view>
      </view>
      <view class="side-quick-grid">
        <view
          v-for="item in quickActions"
          :key="item.label"
          class="side-quick"
          @click="emit('navigate', item.url)"
        >
          <view class="side-quick-icon" :style="{ background: item.gradient }"><LumiIcon class="side-quick-glyph" :name="item.icon" :size="20" /></view>
          <text class="side-quick-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="side-list">
      <view
        v-for="item in rows"
        :key="item.label"
        class="side-row"
        @click="emit('navigate', item.url)"
      >
        <view class="side-row-icon" :style="{ color: item.color }"><LumiIcon :name="item.icon" :size="20" /></view>
        <text class="side-row-text">{{ item.label }}</text>
        <text v-if="item.badge" class="side-badge">{{ item.badge }}</text>
        <LumiIcon class="side-arrow" name="chevron-right" :size="18" />
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
  display: flex;
  flex-direction: column;
  width: 280px;
  box-sizing: border-box;
  background: var(--bg-card);
  box-shadow: 14px 0 40px rgba(14, 31, 58, 0.18);
  transform: translateX(-100%);
  visibility: hidden;
  transition:
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.4s;
}

.side-drawer.show {
  transform: translateX(0);
  visibility: visible;
}

.side-head {
  padding: 90px 20px 24px;
  background: var(--gradient-sky);
  border-bottom: 1px solid var(--border);
}

.side-user {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 20px;
}

.side-avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.side-info {
  min-width: 0;
}

.side-name {
  overflow: hidden;
  font-size: 17px;
  font-weight: 700;
  color: var(--fg-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-points {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 3px;
  font-size: 16px;
  color: var(--accent);
}

.side-points-icon {
  display: block;
  align-self: center;
  line-height: 1;
}

.side-points-num {
  display: block;
  font-weight: 700;
  line-height: 16px;
  color: var(--accent);
}

.side-points-label {
  color: var(--fg-muted);
}

.side-quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.side-quick {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.side-quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  color: #fff;
  border-radius: 12px;
}

.side-quick-icon :deep(.lumi-icon) {
  display: block;
  margin: auto;
}

.side-quick-glyph {
  display: block;
  margin: auto;
  line-height: 1;
}

.side-quick-label {
  font-size: 12px;
  color: var(--fg-secondary);
}

.side-list {
  flex: 1;
  padding: 12px 0;
}

.side-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 16px;
  transition: background 0.2s;
}

.side-row:active {
  background: var(--accent-soft);
}

.side-row-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 20px;
}

.side-row-text {
  flex: 1;
  font-size: 15px;
  color: var(--fg-primary);
}

.side-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--rose);
  border-radius: 999px;
}

.side-arrow {
  font-size: 18px;
  color: var(--fg-muted);
}
</style>
