/**
 * API 统一请求层
 * 根据 useMockData 开关决定使用 mock 数据还是真实后端
 */
import { get, post, put, del } from './request';
import {
  MOCK_CURRENT_USER, MOCK_USERS, USER_DISPLAY,
  MOCK_BANNERS, MOCK_GAMEPLAYS, MOCK_MODELS, MOCK_STYLES,
  MOCK_WORKS, MOCK_DRAFTS, MOCK_TAGS, MOCK_HOT_SEARCHES,
  MOCK_RECHARGE_TIERS, MOCK_MEMBER_PLANS, MOCK_CHECKIN_MILESTONES,
  MOCK_TRANSACTIONS, MOCK_MESSAGES, MOCK_INVITE_RECORDS,
} from './mock-data';

// ========== 开关管理 ==========
const STORAGE_KEY = 'use_mock_data';

export function getUseMock(): boolean {
  try {
    const val = uni.getStorageSync(STORAGE_KEY);
    return val === '' ? true : !!val; // 默认开启 mock
  } catch { return true; }
}

export function setUseMock(val: boolean) {
  uni.setStorageSync(STORAGE_KEY, val);
}

function isMock(): boolean {
  return getUseMock();
}

// mock 模拟延迟
function mockDelay<T>(data: T, ms = 200): Promise<{ code: number; msg: string; data: T }> {
  return new Promise(resolve => {
    setTimeout(() => resolve({ code: 200, msg: 'ok', data }), ms);
  });
}

// ========== 用户 ==========
export const userApi = {
  getProfile: () => isMock()
    ? mockDelay(MOCK_CURRENT_USER)
    : get('/user/profile'),

  updateProfile: (data: any) => isMock()
    ? mockDelay({ ...MOCK_CURRENT_USER, ...data })
    : put('/user/profile', data),

  getCredits: () => isMock()
    ? mockDelay({ credits: MOCK_CURRENT_USER.credits })
    : get('/user/credits'),

  getUserById: (id: string) => isMock()
    ? mockDelay(MOCK_USERS.find(u => u.id === id) || null)
    : get(`/user/${id}`),
};

// ========== 作品 ==========
export const workApi = {
  getHomeWorks: (tab = 'recommend', page = 1) => isMock()
    ? mockDelay({ list: tab === 'new' ? [...MOCK_WORKS].reverse() : MOCK_WORKS.slice(0, 8), total: MOCK_WORKS.length })
    : get('/works/home', { tab, page }),

  getPlazaWorks: (params: any = {}) => isMock()
    ? mockDelay({ list: params.user_id ? MOCK_WORKS.filter(w => w.user_id === params.user_id) : MOCK_WORKS, total: MOCK_WORKS.length })
    : get('/works', params),

  getMyWorks: () => isMock()
    ? mockDelay({ published: MOCK_WORKS.filter(w => w.user_id === 'u001'), drafts: MOCK_DRAFTS })
    : get('/works/mine'),

  getWorkDetail: (id: string) => isMock()
    ? mockDelay((() => {
        const w = MOCK_WORKS.find(x => x.id === id) || MOCK_DRAFTS.find(x => x.id === id);
        if (!w) return null;
        const u = MOCK_USERS.find(x => x.id === w.user_id);
        return { ...w, user: u || null };
      })())
    : get(`/works/${id}`),

  searchWorks: (keyword: string) => isMock()
    ? mockDelay({ list: MOCK_WORKS.filter(w => w.title.includes(keyword) || w.prompt.includes(keyword) || w.tags.some(t => t.includes(keyword))) })
    : get('/works/search', { keyword }),

  likeWork: (id: string) => isMock()
    ? mockDelay({ liked: true })
    : post(`/works/${id}/like`),

  favoriteWork: (id: string) => isMock()
    ? mockDelay({ favorited: true })
    : post(`/works/${id}/favorite`),

  publishWork: (data: any) => isMock()
    ? mockDelay({ id: 'w_new_' + Date.now() })
    : post('/works', data),

  deleteWork: (id: string) => isMock()
    ? mockDelay({ success: true })
    : del(`/works/${id}`),
};

// ========== 配置数据 ==========
export const configApi = {
  getBanners: () => isMock()
    ? mockDelay(MOCK_BANNERS)
    : get('/banners'),

  getGameplays: () => isMock()
    ? mockDelay(MOCK_GAMEPLAYS)
    : get('/gameplays'),

  getModels: () => isMock()
    ? mockDelay(MOCK_MODELS)
    : get('/models'),

  getStyles: () => isMock()
    ? mockDelay(MOCK_STYLES)
    : get('/styles'),

  getTags: () => isMock()
    ? mockDelay(MOCK_TAGS)
    : get('/tags'),

  getHotSearches: () => isMock()
    ? mockDelay(MOCK_HOT_SEARCHES)
    : get('/hot-searches'),
};

// ========== 签到 ==========
export const checkinApi = {
  getStatus: () => isMock()
    ? mockDelay({ checked_today: MOCK_CURRENT_USER.checked_today, streak: MOCK_CURRENT_USER.checkin_streak })
    : get('/checkin/status'),

  doCheckin: () => isMock()
    ? mockDelay({ credits_earned: 10, streak: MOCK_CURRENT_USER.checkin_streak + 1 })
    : post('/checkin'),

  getMilestones: () => isMock()
    ? mockDelay(MOCK_CHECKIN_MILESTONES)
    : get('/checkin/milestones'),
};

// ========== 充值/会员 ==========
export const paymentApi = {
  getRechargeTiers: () => isMock()
    ? mockDelay(MOCK_RECHARGE_TIERS)
    : get('/recharge/tiers'),

  getMemberPlans: () => isMock()
    ? mockDelay(MOCK_MEMBER_PLANS)
    : get('/membership/plans'),

  getTransactions: (type = 'all') => isMock()
    ? mockDelay(type === 'all' ? MOCK_TRANSACTIONS : MOCK_TRANSACTIONS.filter(t => t.type === (type === 'earn' ? 'income' : 'expense')))
    : get('/transactions', { type }),
};

// ========== 消息 ==========
export const messageApi = {
  getCategories: () => isMock()
    ? mockDelay(Object.keys(MOCK_MESSAGES).map(key => ({
        key,
        unread: MOCK_MESSAGES[key].filter((m: any) => !m.is_read).length,
        latest: MOCK_MESSAGES[key][0] || null,
      })))
    : get('/messages'),

  getByType: (type: string) => isMock()
    ? mockDelay(MOCK_MESSAGES[type] || [])
    : get('/messages', { type }),
};

// ========== 关注/社交 ==========
export const socialApi = {
  follow: (userId: string) => isMock()
    ? mockDelay({ followed: true })
    : post(`/user/${userId}/follow`),

  unfollow: (userId: string) => isMock()
    ? mockDelay({ followed: false })
    : del(`/user/${userId}/follow`),

  getFollowList: (type: string) => isMock()
    ? mockDelay(MOCK_USERS.filter(u => u.id !== 'u001'))
    : get('/user/follows', { type }),
};

// ========== 邀请 ==========
export const inviteApi = {
  getInfo: () => isMock()
    ? mockDelay({ invite_code: MOCK_CURRENT_USER.invite_code, records: MOCK_INVITE_RECORDS, count: MOCK_INVITE_RECORDS.length })
    : get('/invite/info'),
};

// ========== 生成 ==========
export const generateApi = {
  create: (data: any) => isMock()
    ? mockDelay({ id: 'gen_' + Date.now(), status: 'pending' })
    : post('/generate', data),

  getStatus: (id: string) => isMock()
    ? mockDelay({ status: 'success', result_urls: [`https://picsum.photos/seed/${id}/400/560`] })
    : get(`/generate/${id}`),

  reversePrompt: (imageUrl: string) => isMock()
    ? mockDelay({ prompt: 'a beautiful anime girl with long blue hair, sitting by a window, soft sunlight, cherry blossoms outside, detailed eyes, studio ghibli style, warm color palette, dreamy atmosphere' })
    : post('/generate/reverse-prompt', { image_url: imageUrl }),
};

// ========== 辅助函数 ==========
export const CURRENT_USER_ID = MOCK_CURRENT_USER.id;

export function isMyWork(userId: string): boolean {
  if (isMock()) return userId === MOCK_CURRENT_USER.id;
  // 真实环境下从缓存读取当前用户ID
  try { const u = JSON.parse(uni.getStorageSync('user_info') || '{}'); return u.id === userId; } catch { return false; }
}

export function getUserDisplay(userId: string) {
  return USER_DISPLAY[userId] || { avatar: '?', color: '#8497B5' };
}

export function getUserInfo(userId: string) {
  return MOCK_USERS.find(u => u.id === userId);
}
