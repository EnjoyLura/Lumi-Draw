import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref('');
  const userInfo = ref<any>(null);
  const credits = ref(0);

  const setToken = (t: string) => {
    token.value = t;
    uni.setStorageSync('token', t);
  };

  const setUserInfo = (info: any) => {
    userInfo.value = info;
  };

  const setCredits = (c: number) => {
    credits.value = c;
  };

  const logout = () => {
    token.value = '';
    userInfo.value = null;
    credits.value = 0;
    uni.removeStorageSync('token');
  };

  return { token, userInfo, credits, setToken, setUserInfo, setCredits, logout };
});
