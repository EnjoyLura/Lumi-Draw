/**
 * Mock 数据层 - 完全按照后端 API 响应格式
 * 所有数据结构对齐数据库表设计
 */

// ========== 用户 ==========
export const MOCK_CURRENT_USER = {
  id: 'u001',
  openid: 'mock_openid_001',
  nickname: '云端造梦师',
  avatar_url: '',
  gender: 2, // 0未知 1男 2女
  signature: '用AI描绘心中的梦境，每一笔都是想象力的延伸',
  credits: 2860,
  member_type: '',
  member_expires_at: null,
  invite_code: 'LUMI8829',
  status: 'active',
  works_count: 48,
  followers_count: 326,
  following_count: 58,
  likes_count: 1200,
  checkin_streak: 7,
  checked_today: false,
  created_at: '2025-03-01T00:00:00Z',
};

export const MOCK_USERS = [
  { id: 'u001', nickname: '云端造梦师', avatar_url: '', gender: 2, signature: '用AI描绘心中的梦境', invite_code: 'LUMI8829', credits: 2860, works_count: 48, followers_count: 326, following_count: 58, likes_count: 1200 },
  { id: 'u002', nickname: '星辰大海', avatar_url: '', gender: 1, signature: '探索AI的无限可能', invite_code: 'LUMI0002', credits: 1500, works_count: 36, followers_count: 215, following_count: 42, likes_count: 890 },
  { id: 'u003', nickname: '月光如水', avatar_url: '', gender: 2, signature: '月光下的AI画家', invite_code: 'LUMI0003', credits: 980, works_count: 28, followers_count: 180, following_count: 35, likes_count: 650 },
  { id: 'u004', nickname: '风之绘师', avatar_url: '', gender: 1, signature: '风中捕捉灵感', invite_code: 'LUMI0004', credits: 720, works_count: 22, followers_count: 95, following_count: 28, likes_count: 420 },
  { id: 'u005', nickname: '光影魔术', avatar_url: '', gender: 1, signature: '玩转光与影的魔法', invite_code: 'LUMI0005', credits: 450, works_count: 15, followers_count: 68, following_count: 20, likes_count: 310 },
];

// 用户显示辅助（头像字+颜色，因无真实图片）
export const USER_DISPLAY: Record<string, { avatar: string; color: string }> = {
  'u001': { avatar: '梦', color: '#5B9FE8' },
  'u002': { avatar: '星', color: '#6FD4B0' },
  'u003': { avatar: '月', color: '#FFB59A' },
  'u004': { avatar: '风', color: '#B8A5E3' },
  'u005': { avatar: '光', color: '#FFE08A' },
};

// ========== Banner ==========
export const MOCK_BANNERS = [
  { id: 'b001', title: '夏日创作季', image_url: 'https://picsum.photos/seed/b1/700/300', link_url: '', sort_order: 0, enabled: true },
  { id: 'b002', title: '新模型上线', image_url: 'https://picsum.photos/seed/b2/700/300', link_url: '', sort_order: 1, enabled: true },
  { id: 'b003', title: '会员特惠', image_url: 'https://picsum.photos/seed/b3/700/300', link_url: '', sort_order: 2, enabled: true },
  { id: 'b004', title: '社区精选', image_url: 'https://picsum.photos/seed/b4/700/300', link_url: '', sort_order: 3, enabled: true },
];

// ========== 玩法模板 ==========
export const MOCK_GAMEPLAYS = [
  { id: 'gp001', name: '人物美颜', cover_url: 'https://picsum.photos/seed/gp1/300/400', uses_count: '12.6w', is_hot: true, sort_order: 0, enabled: true },
  { id: 'gp002', name: '证件照', cover_url: 'https://picsum.photos/seed/gp2/300/400', uses_count: '8.3w', is_hot: true, sort_order: 1, enabled: true },
  { id: 'gp003', name: '宠物头像', cover_url: 'https://picsum.photos/seed/gp3/300/400', uses_count: '5.1w', is_hot: false, sort_order: 2, enabled: true },
  { id: 'gp004', name: '古风国潮', cover_url: 'https://picsum.photos/seed/gp4/300/400', uses_count: '4.8w', is_hot: false, sort_order: 3, enabled: true },
  { id: 'gp005', name: 'Q版头像', cover_url: 'https://picsum.photos/seed/gp5/300/400', uses_count: '6.2w', is_hot: true, sort_order: 4, enabled: true },
  { id: 'gp006', name: 'Logo设计', cover_url: 'https://picsum.photos/seed/gp6/300/400', uses_count: '3.9w', is_hot: false, sort_order: 5, enabled: true },
  { id: 'gp007', name: '壁纸', cover_url: 'https://picsum.photos/seed/gp7/300/400', uses_count: '7.5w', is_hot: false, sort_order: 6, enabled: true },
  { id: 'gp008', name: '表情包', cover_url: 'https://picsum.photos/seed/gp8/300/400', uses_count: '9.0w', is_hot: true, sort_order: 7, enabled: true },
];

// ========== AI模型 ==========
export const MOCK_MODELS = [
  { id: 'md001', kie_model: 'gpt-image-2', name: 'GPT Image 2', description: '画质细腻·理解力强', tags: ['写实', '高清'], credits_cost: 15, cover_url: 'https://picsum.photos/seed/gpt2/200/120', badge: '推荐', badge_color: '#5B9FE8', sort_order: 0, enabled: true },
  { id: 'md002', kie_model: 'nano-banana-2', name: 'Nano Banana 2', description: '速度极快·性价比高', tags: ['快速', '全能'], credits_cost: 8, cover_url: 'https://picsum.photos/seed/nano/200/120', badge: '性价比', badge_color: '#6FD4B0', sort_order: 1, enabled: true },
  { id: 'md003', kie_model: 'flux-pro', name: 'Flux Pro', description: '艺术感强·细节丰富', tags: ['艺术', '创意'], credits_cost: 12, cover_url: 'https://picsum.photos/seed/flux/200/120', badge: 'NEW', badge_color: '#FFA8B8', sort_order: 2, enabled: true },
  { id: 'md004', kie_model: 'sdxl', name: 'SDXL', description: '开源之王·风格多样', tags: ['多样', '自定义'], credits_cost: 6, cover_url: 'https://picsum.photos/seed/sdxl/200/120', badge: '性价比', badge_color: '#6FD4B0', sort_order: 3, enabled: true },
  { id: 'md005', kie_model: 'dalle3', name: 'DALL-E 3', description: '语义理解·精准还原', tags: ['精准', '还原'], credits_cost: 14, cover_url: 'https://picsum.photos/seed/dalle/200/120', badge: '', badge_color: '', sort_order: 4, enabled: true },
  { id: 'md006', kie_model: 'midjourney', name: 'Midjourney', description: '艺术天花板·极致美学', tags: ['美学', '艺术'], credits_cost: 20, cover_url: 'https://picsum.photos/seed/mj/200/120', badge: '推荐', badge_color: '#5B9FE8', sort_order: 5, enabled: true },
];

// ========== 风格 ==========
export const MOCK_STYLES = [
  { id: 'st001', name: '赛博朋克', image_url: 'https://picsum.photos/seed/赛博朋克/100/100', sort_order: 0, enabled: true },
  { id: 'st002', name: '赛璐碌', image_url: 'https://picsum.photos/seed/赛璐碌/100/100', sort_order: 1, enabled: true },
  { id: 'st003', name: '黑白', image_url: 'https://picsum.photos/seed/黑白/100/100', sort_order: 2, enabled: true },
  { id: 'st004', name: '国风', image_url: 'https://picsum.photos/seed/国风/100/100', sort_order: 3, enabled: true },
  { id: 'st005', name: '油画', image_url: 'https://picsum.photos/seed/油画/100/100', sort_order: 4, enabled: true },
  { id: 'st006', name: '水彩', image_url: 'https://picsum.photos/seed/水彩/100/100', sort_order: 5, enabled: true },
  { id: 'st007', name: '二次元', image_url: 'https://picsum.photos/seed/二次元/100/100', sort_order: 6, enabled: true },
  { id: 'st008', name: '写实', image_url: 'https://picsum.photos/seed/写实/100/100', sort_order: 7, enabled: true },
  { id: 'st009', name: '3D', image_url: 'https://picsum.photos/seed/3D/100/100', sort_order: 8, enabled: true },
  { id: 'st010', name: '像素', image_url: 'https://picsum.photos/seed/像素/100/100', sort_order: 9, enabled: true },
  { id: 'st011', name: '蒸汽波', image_url: 'https://picsum.photos/seed/蒸汽波/100/100', sort_order: 10, enabled: true },
  { id: 'st012', name: '极简', image_url: 'https://picsum.photos/seed/极简/100/100', sort_order: 11, enabled: true },
  { id: 'st013', name: '梦幻', image_url: 'https://picsum.photos/seed/梦幻/100/100', sort_order: 12, enabled: true },
  { id: 'st014', name: '暗黑', image_url: 'https://picsum.photos/seed/暗黑/100/100', sort_order: 13, enabled: true },
  { id: 'st015', name: '复古', image_url: 'https://picsum.photos/seed/复古/100/100', sort_order: 14, enabled: true },
];

// ========== 作品 ==========
export const MOCK_WORKS = [
  { id: 'w001', user_id: 'u002', title: '霓虹都市', description: '赛博朋克风格的夜晚城市', image_urls: ['https://picsum.photos/seed/w1/300/420'], model: 'gpt-image-2', style: '赛博朋克', aspect_ratio: '3:4', resolution: '2K', prompt: 'cyberpunk city at night, neon lights, rain, reflective streets', status: 'published', is_featured: true, likes_count: 328, favorites_count: 92, remakes_count: 45, tags: ['夜景', '城市'], published_at: '2025-06-28T14:30:00Z', created_at: '2025-06-28T12:00:00Z' },
  { id: 'w002', user_id: 'u003', title: '山水之间', description: '水墨丹青的国风意境', image_urls: ['https://picsum.photos/seed/w2/300/225'], model: 'sdxl', style: '国风', aspect_ratio: '4:3', resolution: '1K', prompt: 'Chinese ink painting, mountains and rivers', status: 'published', is_featured: true, likes_count: 512, favorites_count: 156, remakes_count: 78, tags: ['国风', '山水'], published_at: '2025-06-27T10:00:00Z', created_at: '2025-06-27T08:00:00Z' },
  { id: 'w003', user_id: 'u001', title: '少女与猫', description: '少女与猫的温暖日常', image_urls: ['https://picsum.photos/seed/w3/300/450'], model: 'gpt-image-2', style: '二次元', aspect_ratio: '3:4', resolution: '2K', prompt: 'anime girl with cat, warm daily life', status: 'published', is_featured: true, likes_count: 680, favorites_count: 234, remakes_count: 120, tags: ['二次元', '日常'], published_at: '2025-06-26T16:00:00Z', created_at: '2025-06-26T14:00:00Z' },
  { id: 'w004', user_id: 'u005', title: '抽象梦境', description: '漂浮的岛屿与柔和色调', image_urls: ['https://picsum.photos/seed/w4/300/300'], model: 'flux-pro', style: '梦幻', aspect_ratio: '1:1', resolution: '1K', prompt: 'abstract dreamscape, floating islands, soft tones', status: 'published', is_featured: false, likes_count: 234, favorites_count: 67, remakes_count: 23, tags: ['抽象', '梦幻'], published_at: '2025-06-25T12:00:00Z', created_at: '2025-06-25T10:00:00Z' },
  { id: 'w005', user_id: 'u001', title: '古风少女', description: '古风少女与桃花', image_urls: ['https://picsum.photos/seed/w5/300/530'], model: 'midjourney', style: '国风', aspect_ratio: '9:16', resolution: '2K', prompt: 'ancient Chinese girl with peach blossoms', status: 'published', is_featured: true, likes_count: 892, favorites_count: 345, remakes_count: 180, tags: ['国风', '人物'], published_at: '2025-06-24T14:00:00Z', created_at: '2025-06-24T12:00:00Z' },
  { id: 'w006', user_id: 'u003', title: '赛博精灵', description: '发光的眼睛与未来感', image_urls: ['https://picsum.photos/seed/w6/300/225'], model: 'flux-pro', style: '赛博朋克', aspect_ratio: '4:3', resolution: '1K', prompt: 'cyber elf, glowing eyes, futuristic', status: 'published', is_featured: false, likes_count: 445, favorites_count: 128, remakes_count: 56, tags: ['科幻', '人物'], published_at: '2025-06-23T10:00:00Z', created_at: '2025-06-23T08:00:00Z' },
  { id: 'w007', user_id: 'u004', title: '水彩猫咪', description: '柔软的笔触与温暖色调', image_urls: ['https://picsum.photos/seed/w7/300/400'], model: 'sdxl', style: '水彩', aspect_ratio: '3:4', resolution: '1K', prompt: 'watercolor cat, soft brushstrokes, warm palette', status: 'published', is_featured: false, likes_count: 567, favorites_count: 189, remakes_count: 92, tags: ['动物', '水彩'], published_at: '2025-06-22T16:00:00Z', created_at: '2025-06-22T14:00:00Z' },
  { id: 'w008', user_id: 'u005', title: '极简几何', description: '干净的线条与柔和配色', image_urls: ['https://picsum.photos/seed/w8/300/300'], model: 'sdxl', style: '极简', aspect_ratio: '1:1', resolution: '1K', prompt: 'minimalist geometric art, clean lines, soft colors', status: 'published', is_featured: false, likes_count: 189, favorites_count: 45, remakes_count: 12, tags: ['抽象', '极简'], published_at: '2025-06-21T12:00:00Z', created_at: '2025-06-21T10:00:00Z' },
  { id: 'w009', user_id: 'u002', title: '暗黑天使', description: '哥特风格与戏剧性光影', image_urls: ['https://picsum.photos/seed/w9/300/530'], model: 'midjourney', style: '暗黑', aspect_ratio: '9:16', resolution: '2K', prompt: 'dark angel, gothic style, dramatic lighting', status: 'published', is_featured: false, likes_count: 723, favorites_count: 267, remakes_count: 134, tags: ['暗黑', '奇幻'], published_at: '2025-06-20T14:00:00Z', created_at: '2025-06-20T12:00:00Z' },
  { id: 'w010', user_id: 'u003', title: '蒸汽城市', description: '黄铜与齿轮的复古未来', image_urls: ['https://picsum.photos/seed/w10/300/225'], model: 'flux-pro', style: '蒸汽波', aspect_ratio: '4:3', resolution: '1K', prompt: 'steampunk city, brass and gears, retro future', status: 'published', is_featured: false, likes_count: 356, favorites_count: 98, remakes_count: 41, tags: ['科幻', '建筑'], published_at: '2025-06-19T10:00:00Z', created_at: '2025-06-19T08:00:00Z' },
  { id: 'w011', user_id: 'u001', title: '油画风景', description: '金色麦田与日落印象', image_urls: ['https://picsum.photos/seed/w11/300/400'], model: 'gpt-image-2', style: '油画', aspect_ratio: '3:4', resolution: '2K', prompt: 'oil painting landscape, golden wheat field, sunset', status: 'published', is_featured: false, likes_count: 489, favorites_count: 167, remakes_count: 78, tags: ['风景', '油画'], published_at: '2025-06-18T16:00:00Z', created_at: '2025-06-18T14:00:00Z' },
  { id: 'w012', user_id: 'u005', title: '像素冒险', description: '16位复古游戏风格', image_urls: ['https://picsum.photos/seed/w12/300/300'], model: 'sdxl', style: '像素', aspect_ratio: '1:1', resolution: '1K', prompt: 'pixel art adventure, 16-bit retro game style', status: 'published', is_featured: false, likes_count: 278, favorites_count: 89, remakes_count: 34, tags: ['像素', '游戏'], published_at: '2025-06-17T12:00:00Z', created_at: '2025-06-17T10:00:00Z' },
];

// 当前用户的草稿作品
export const MOCK_DRAFTS = [
  { id: 'w101', user_id: 'u001', title: '花园里的可爱机器人', description: '', image_urls: ['https://picsum.photos/seed/w13/300/400'], model: 'gpt-image-2', style: '梦幻', aspect_ratio: '3:4', resolution: '2K', prompt: 'cute robot in a garden, flowers, butterflies', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-28T20:00:00Z' },
  { id: 'w102', user_id: 'u001', title: '发光蘑菇的魔法森林', description: '', image_urls: ['https://picsum.photos/seed/w14/300/300'], model: 'flux-pro', style: '梦幻', aspect_ratio: '1:1', resolution: '1K', prompt: 'magic forest with glowing mushrooms', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-28T18:00:00Z' },
  { id: 'w103', user_id: 'u001', title: '星空下的灯塔', description: '', image_urls: ['https://picsum.photos/seed/w15/300/530'], model: 'sdxl', style: '写实', aspect_ratio: '9:16', resolution: '1K', prompt: 'lighthouse under starry sky', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-27T22:00:00Z' },
  { id: 'w104', user_id: 'u001', title: '竹林深处的古寺', description: '', image_urls: ['https://picsum.photos/seed/w16/300/225'], model: 'nano-banana-2', style: '国风', aspect_ratio: '4:3', resolution: '1K', prompt: 'ancient temple deep in bamboo forest', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-27T16:00:00Z' },
  { id: 'w105', user_id: 'u001', title: '赛博朋克风格的猫咪', description: '', image_urls: ['https://picsum.photos/seed/w17/300/400'], model: 'gpt-image-2', style: '赛博朋克', aspect_ratio: '3:4', resolution: '2K', prompt: 'cyberpunk cat with neon eyes', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-26T20:00:00Z' },
  { id: 'w106', user_id: 'u001', title: '水墨风格的鲤鱼跃龙门', description: '', image_urls: ['https://picsum.photos/seed/w18/300/300'], model: 'sdxl', style: '国风', aspect_ratio: '1:1', resolution: '1K', prompt: 'ink painting, carp leaping over dragon gate', status: 'draft', likes_count: 0, favorites_count: 0, remakes_count: 0, tags: [], created_at: '2025-06-25T18:00:00Z' },
];

// ========== 标签 ==========
export const MOCK_TAGS = [
  { id: 't001', name: '人物', category: 'themes', sort_order: 0 },
  { id: 't002', name: '风景', category: 'scenes', sort_order: 1 },
  { id: 't003', name: '建筑', category: 'scenes', sort_order: 2 },
  { id: 't004', name: '动物', category: 'themes', sort_order: 3 },
  { id: 't005', name: '科幻', category: 'themes', sort_order: 4 },
  { id: 't006', name: '奇幻', category: 'themes', sort_order: 5 },
  { id: 't007', name: '写实', category: 'styles', sort_order: 6 },
  { id: 't008', name: '二次元', category: 'styles', sort_order: 7 },
  { id: 't009', name: '水彩', category: 'styles', sort_order: 8 },
  { id: 't010', name: '油画', category: 'styles', sort_order: 9 },
  { id: 't011', name: '像素', category: 'styles', sort_order: 10 },
  { id: 't012', name: '3D', category: 'styles', sort_order: 11 },
  { id: 't013', name: '日常', category: 'scenes', sort_order: 12 },
  { id: 't014', name: '节日', category: 'scenes', sort_order: 13 },
  { id: 't015', name: '壁纸', category: 'themes', sort_order: 14 },
  { id: 't016', name: '头像', category: 'themes', sort_order: 15 },
];

// ========== 热搜词 ==========
export const MOCK_HOT_SEARCHES = [
  { id: 'hs001', keyword: '赛博朋克', volume: 12600, sort_order: 0, enabled: true },
  { id: 'hs002', keyword: '古风少女', volume: 9800, sort_order: 1, enabled: true },
  { id: 'hs003', keyword: '证件照', volume: 8300, sort_order: 2, enabled: true },
  { id: 'hs004', keyword: '宠物头像', volume: 7500, sort_order: 3, enabled: true },
  { id: 'hs005', keyword: '二次元', volume: 6200, sort_order: 4, enabled: true },
  { id: 'hs006', keyword: '国风山水', volume: 4800, sort_order: 5, enabled: true },
  { id: 'hs007', keyword: 'Logo设计', volume: 3900, sort_order: 6, enabled: true },
  { id: 'hs008', keyword: '表情包', volume: 9000, sort_order: 7, enabled: true },
];

// ========== 充值档位 ==========
export const MOCK_RECHARGE_TIERS = [
  { id: 'rt001', price: 6, credits: 60, bonus: 0, is_popular: false, sort_order: 0, enabled: true },
  { id: 'rt002', price: 18, credits: 180, bonus: 10, is_popular: false, sort_order: 1, enabled: true },
  { id: 'rt003', price: 30, credits: 300, bonus: 30, is_popular: false, sort_order: 2, enabled: true },
  { id: 'rt004', price: 68, credits: 680, bonus: 100, is_popular: true, sort_order: 3, enabled: true },
  { id: 'rt005', price: 128, credits: 1280, bonus: 280, is_popular: false, sort_order: 4, enabled: true },
];

// ========== 会员方案 ==========
export const MOCK_MEMBER_PLANS = [
  { id: 'mp001', name: 'monthly', display_name: '月卡', price: 18, daily_credits: 50, benefits: '每日领取50积分 · 共1500积分', sort_order: 0, enabled: true },
  { id: 'mp002', name: 'quarterly', display_name: '季卡', price: 48, daily_credits: 50, benefits: '每日领取50积分 · 共4500积分', sort_order: 1, enabled: true },
  { id: 'mp003', name: 'yearly', display_name: '年卡', price: 168, daily_credits: 50, benefits: '每日领取50积分 · 共18000积分', sort_order: 2, enabled: true },
];

// ========== 签到里程碑 ==========
export const MOCK_CHECKIN_MILESTONES = [
  { id: 'cm001', consecutive_days: 3, reward_credits: 20, enabled: true },
  { id: 'cm002', consecutive_days: 7, reward_credits: 50, enabled: true },
  { id: 'cm003', consecutive_days: 14, reward_credits: 100, enabled: true },
  { id: 'cm004', consecutive_days: 30, reward_credits: 300, enabled: true },
];

// ========== 积分记录 ==========
export const MOCK_TRANSACTIONS = [
  { id: 'tr001', user_id: 'u001', type: 'income', channel: 'recharge', credits_change: 780, balance_after: 2860, amount: 68, remark: '充值 ¥68', created_at: '2025-06-18T14:30:00Z' },
  { id: 'tr002', user_id: 'u001', type: 'expense', channel: 'create', credits_change: -60, balance_after: 2080, amount: null, remark: '创作消耗 (GPT Image 2 × 4张)', created_at: '2025-06-18T16:20:00Z' },
  { id: 'tr003', user_id: 'u001', type: 'income', channel: 'checkin', credits_change: 10, balance_after: 2090, amount: null, remark: '每日签到', created_at: '2025-06-18T09:12:00Z' },
  { id: 'tr004', user_id: 'u001', type: 'income', channel: 'invite', credits_change: 50, balance_after: 2140, amount: null, remark: '邀请好友奖励', created_at: '2025-06-15T10:00:00Z' },
  { id: 'tr005', user_id: 'u001', type: 'expense', channel: 'create', credits_change: -16, balance_after: 2124, amount: null, remark: '创作消耗 (Nano Banana 2 × 2张)', created_at: '2025-06-14T15:30:00Z' },
];

// ========== 消息 ==========
export const MOCK_MESSAGES: Record<string, any[]> = {
  like: [
    { id: 'msg001', user_id: 'u001', type: 'like', title: '点赞', content: '赞了你的作品「霓虹都市」', is_read: false, related_id: 'w001', from_user: 'u003', created_at: '2025-06-28T16:30:00Z' },
    { id: 'msg002', user_id: 'u001', type: 'like', title: '点赞', content: '赞了你的作品「古风少女」', is_read: false, related_id: 'w005', from_user: 'u004', created_at: '2025-06-28T15:00:00Z' },
    { id: 'msg003', user_id: 'u001', type: 'like', title: '点赞', content: '赞了你的作品「少女与猫」', is_read: false, related_id: 'w003', from_user: 'u002', created_at: '2025-06-28T12:00:00Z' },
  ],
  favorite: [
    { id: 'msg004', user_id: 'u001', type: 'favorite', title: '收藏', content: '收藏了你的作品「古风少女」', is_read: false, related_id: 'w005', from_user: 'u004', created_at: '2025-06-28T14:00:00Z' },
    { id: 'msg005', user_id: 'u001', type: 'favorite', title: '收藏', content: '收藏了你的作品「油画风景」', is_read: false, related_id: 'w011', from_user: 'u002', created_at: '2025-06-28T10:00:00Z' },
  ],
  remake: [
    { id: 'msg006', user_id: 'u001', type: 'remake', title: '同款生成', content: '使用了你的提示词', is_read: false, from_user: 'u003', created_at: '2025-06-28T11:00:00Z' },
  ],
  follow: [
    { id: 'msg007', user_id: 'u001', type: 'follow', title: '新粉丝', content: '关注了你', is_read: false, from_user: 'u002', created_at: '2025-06-28T09:00:00Z' },
  ],
  system: [
    { id: 'msg008', user_id: 'u001', type: 'system', title: '系统通知', content: '每日签到 +10 积分已到账', is_read: true, created_at: '2025-06-27T09:00:00Z' },
  ],
  service: [
    { id: 'msg009', user_id: 'u001', type: 'service', title: '官方客服', content: '感谢使用Lumi-Draw，有问题随时联系我们', is_read: true, created_at: '2025-06-25T10:00:00Z' },
  ],
};

// ========== 邀请记录 ==========
export const MOCK_INVITE_RECORDS = [
  { user_id: 'u002', nickname: '星辰大海', created_at: '2025-06-15T10:00:00Z' },
  { user_id: 'u003', nickname: '月光如水', created_at: '2025-06-12T14:00:00Z' },
  { user_id: 'u004', nickname: '风之绘师', created_at: '2025-06-08T09:00:00Z' },
];
