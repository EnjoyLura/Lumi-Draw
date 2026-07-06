<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useDataMode } from "../../services/dataMode";
import { refreshNavigationTitle } from "../../services/navigationTitle";
import { fetchAgreement } from "../settings/settingsService";
import { useTheme } from "../../services/theme";

const { themeClass } = useTheme();

const mockAgreements: Record<string, { title: string; content: string }> = {
  user: {
    title: "用户协议",
    content: "欢迎使用露米绘画。使用本服务即表示你同意遵守平台规则，不生成违法违规、侵权或伤害他人的内容。"
  },
  privacy: {
    title: "隐私政策",
    content: "我们仅在提供登录、创作、支付、审核和客服所必需的范围内处理你的信息，并按法律法规要求保护数据安全。"
  },
  recharge: {
    title: "充值协议",
    content: "积分属于平台虚拟权益，仅用于露米绘画内的 AI 生成等服务。充值前请确认方案内容，支付成功后积分实时入账。"
  },
  membership: {
    title: "会员服务协议",
    content: "会员权益包括积分赠送、签到加成和优先体验等，以页面展示和后台配置为准。"
  }
};

const { useMockData } = useDataMode();
const agreementType = ref("user");
const title = ref("协议");
const content = ref("");
const updatedAt = ref("");
const isLoading = ref(false);
const loadFailed = ref(false);
let lastLoadKey = "";

const updatedText = computed(() => (updatedAt.value ? `更新于 ${updatedAt.value.slice(0, 10)}` : ""));

onLoad((query) => {
  agreementType.value = resolveRouteType(query);
  void loadAgreement();
});

onShow(() => {
  const nextType = resolveRouteType();
  const nextLoadKey = `${nextType}-${useMockData.value}`;
  if (nextType !== agreementType.value) agreementType.value = nextType;
  if (nextLoadKey === lastLoadKey) return;
  void loadAgreement();
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("hashchange", handleHashChange);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("hashchange", handleHashChange);
});

function handleHashChange() {
  const nextType = resolveRouteType();
  if (nextType === agreementType.value) return;
  agreementType.value = nextType;
  void loadAgreement();
}

function resolveRouteType(query?: Record<string, unknown>) {
  const queryType = typeof query?.type === "string" ? query.type : "";
  if (queryType) return queryType;

  if (typeof window !== "undefined") {
    const hashType = window.location.hash.match(/[?&]type=([^&]+)/)?.[1];
    if (hashType) return decodeURIComponent(hashType);
  }

  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as
    | {
        options?: Record<string, string>;
        $page?: { options?: Record<string, string> };
      }
    | undefined;
  return current?.options?.type || current?.$page?.options?.type || "user";
}

async function loadAgreement() {
  lastLoadKey = `${agreementType.value}-${useMockData.value}`;
  const mock = mockAgreements[agreementType.value] || mockAgreements.user;
  title.value = mock.title;
  refreshNavigationTitle(mock.title);
  content.value = "";
  updatedAt.value = "";
  loadFailed.value = false;
  isLoading.value = true;
  try {
    if (useMockData.value) {
      content.value = mock.content;
      return;
    }
    const data = await fetchAgreement(agreementType.value);
    title.value = data.title;
    refreshNavigationTitle(data.title);
    content.value = data.content;
    updatedAt.value = data.updatedAt;
  } catch {
    content.value = "";
    loadFailed.value = true;
    uni.showToast({ title: "协议加载失败，请稍后重试", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <view class="agreement-page" :class="[themeClass, 'page-enter']">
    <scroll-view class="page-scroll" scroll-y>
      <view class="agreement-content">
        <view class="title-row">
          <view>
            <view class="page-title">{{ title }}</view>
            <view v-if="updatedText" class="updated-text">{{ updatedText }}</view>
          </view>
          <view v-if="isLoading" class="spinner" />
        </view>
        <view v-if="!useMockData && loadFailed" class="failure-card">
          <view class="failure-title">协议加载失败</view>
          <view class="failure-sub">当前不会显示本地模拟协议内容，请重新加载后查看后端配置。</view>
          <button class="failure-btn" @click="loadAgreement">重新加载</button>
        </view>
        <view v-else class="content-card">
          <text class="content-text">{{ content }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.agreement-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  overflow: hidden;
  color: var(--fg-primary);
  background: var(--page-bg);
}

.page-scroll {
  height: 100%;
}

.agreement-content {
  padding: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
}

.updated-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--fg-muted);
}

.content-card {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.failure-card {
  padding: 22px 16px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

.failure-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg-primary);
}

.failure-sub {
  margin-bottom: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fg-muted);
}

.failure-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 0 auto;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 999px;
  line-height: 1.4;
}

.failure-btn::after {
  border: none;
}

.content-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--fg-secondary);
  white-space: pre-wrap;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
