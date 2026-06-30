/**
 * 登录状态管理
 */
import { ref } from 'vue';

// 全局登录状态
export const isLoggedIn = ref(!!uni.getStorageSync('token'));

/** 检查是否已登录 */
export function checkLogin(): boolean {
  const token = uni.getStorageSync('token');
  isLoggedIn.value = !!token;
  return !!token;
}

/** 需要登录的操作守卫，未登录时显示登录弹窗 */
export function requireLogin(): boolean {
  if (checkLogin()) return true;
  // 触发全局登录弹窗事件
  uni.$emit('showLoginPopup');
  return false;
}

/** 登录成功后调用 */
export function onLoginSuccess(token: string) {
  uni.setStorageSync('token', token);
  isLoggedIn.value = true;
  uni.$emit('loginSuccess');
}

/** 退出登录 */
export function logout() {
  uni.removeStorageSync('token');
  isLoggedIn.value = false;
  uni.showToast({ title: '已退出登录', icon: 'none' });
}
