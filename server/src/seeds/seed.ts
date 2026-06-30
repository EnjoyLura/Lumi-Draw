import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env' });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'lumidraw',
  password: process.env.DB_PASSWORD || 'lumidraw2025',
  database: process.env.DB_DATABASE || 'lumidraw',
  synchronize: true,
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
});

async function seed() {
  await ds.initialize();
  console.log('Database connected');

  // Banners
  const bannerRepo = ds.getRepository('Banner');
  if ((await bannerRepo.count()) === 0) {
    await bannerRepo.save([
      { title: '夏日创作季', image_url: 'https://picsum.photos/seed/b1/700/300', link_url: '', sort_order: 0, enabled: true },
      { title: '新模型上线', image_url: 'https://picsum.photos/seed/b2/700/300', link_url: '', sort_order: 1, enabled: true },
      { title: '会员特惠', image_url: 'https://picsum.photos/seed/b3/700/300', link_url: '', sort_order: 2, enabled: true },
      { title: '社区精选', image_url: 'https://picsum.photos/seed/b4/700/300', link_url: '', sort_order: 3, enabled: true },
    ]);
    console.log('Banners seeded');
  }

  // Gameplays
  const gpRepo = ds.getRepository('Gameplay');
  if ((await gpRepo.count()) === 0) {
    await gpRepo.save([
      { name: '人物美颜', cover_url: 'https://picsum.photos/seed/gp1/300/400', uses_count: '12.6w', is_hot: true, sort_order: 0 },
      { name: '证件照', cover_url: 'https://picsum.photos/seed/gp2/300/400', uses_count: '8.3w', is_hot: true, sort_order: 1 },
      { name: '宠物头像', cover_url: 'https://picsum.photos/seed/gp3/300/400', uses_count: '5.1w', is_hot: false, sort_order: 2 },
      { name: '古风国潮', cover_url: 'https://picsum.photos/seed/gp4/300/400', uses_count: '4.8w', is_hot: false, sort_order: 3 },
      { name: 'Q版头像', cover_url: 'https://picsum.photos/seed/gp5/300/400', uses_count: '6.2w', is_hot: true, sort_order: 4 },
      { name: 'Logo设计', cover_url: 'https://picsum.photos/seed/gp6/300/400', uses_count: '3.9w', is_hot: false, sort_order: 5 },
      { name: '壁纸', cover_url: 'https://picsum.photos/seed/gp7/300/400', uses_count: '7.5w', is_hot: false, sort_order: 6 },
      { name: '表情包', cover_url: 'https://picsum.photos/seed/gp8/300/400', uses_count: '9.0w', is_hot: true, sort_order: 7 },
    ]);
    console.log('Gameplays seeded');
  }

  // AI Models
  const modelRepo = ds.getRepository('AiModel');
  if ((await modelRepo.count()) === 0) {
    await modelRepo.save([
      { kie_model: 'gpt-image-2', name: 'GPT Image 2', description: '画质细腻·理解力强', tags: ['写实','高清'], credits_cost: 15, cover_url: 'https://picsum.photos/seed/gpt2/200/120', badge: '推荐', badge_color: '#5B9FE8', sort_order: 0 },
      { kie_model: 'nano-banana-2', name: 'Nano Banana 2', description: '速度极快·性价比高', tags: ['快速','全能'], credits_cost: 8, cover_url: 'https://picsum.photos/seed/nano/200/120', badge: '性价比', badge_color: '#6FD4B0', sort_order: 1 },
      { kie_model: 'flux-pro', name: 'Flux Pro', description: '艺术感强·细节丰富', tags: ['艺术','创意'], credits_cost: 12, cover_url: 'https://picsum.photos/seed/flux/200/120', badge: 'NEW', badge_color: '#FFA8B8', sort_order: 2 },
      { kie_model: 'sdxl', name: 'SDXL', description: '开源之王·风格多样', tags: ['多样','自定义'], credits_cost: 6, cover_url: 'https://picsum.photos/seed/sdxl/200/120', badge: '性价比', badge_color: '#6FD4B0', sort_order: 3 },
    ]);
    console.log('AI Models seeded');
  }

  // Styles
  const styleRepo = ds.getRepository('Style');
  if ((await styleRepo.count()) === 0) {
    const styles = ['赛博朋克','赛璐碌','黑白','国风','油画','水彩','二次元','写实','3D','像素','蒸汽波','极简','梦幻','暗黑','复古'];
    await styleRepo.save(styles.map((name, i) => ({ name, image_url: `https://picsum.photos/seed/${name}/100/100`, sort_order: i })));
    console.log('Styles seeded');
  }

  // Tags
  const tagRepo = ds.getRepository('Tag');
  if ((await tagRepo.count()) === 0) {
    await tagRepo.save([
      { name: '人物', category: 'themes' }, { name: '风景', category: 'scenes' }, { name: '建筑', category: 'scenes' },
      { name: '动物', category: 'themes' }, { name: '科幻', category: 'themes' }, { name: '奇幻', category: 'themes' },
      { name: '写实', category: 'styles' }, { name: '二次元', category: 'styles' }, { name: '水彩', category: 'styles' },
      { name: '油画', category: 'styles' }, { name: '像素', category: 'styles' }, { name: '3D', category: 'styles' },
      { name: '日常', category: 'scenes' }, { name: '节日', category: 'scenes' }, { name: '壁纸', category: 'themes' }, { name: '头像', category: 'themes' },
    ]);
    console.log('Tags seeded');
  }

  // Hot Searches
  const hsRepo = ds.getRepository('HotSearch');
  if ((await hsRepo.count()) === 0) {
    await hsRepo.save([
      { keyword: '赛博朋克', volume: 12600, sort_order: 0 }, { keyword: '古风少女', volume: 9800, sort_order: 1 },
      { keyword: '证件照', volume: 8300, sort_order: 2 }, { keyword: '宠物头像', volume: 7500, sort_order: 3 },
      { keyword: '二次元', volume: 6200, sort_order: 4 }, { keyword: '国风山水', volume: 4800, sort_order: 5 },
      { keyword: 'Logo设计', volume: 3900, sort_order: 6 }, { keyword: '表情包', volume: 9000, sort_order: 7 },
    ]);
    console.log('Hot searches seeded');
  }

  // Recharge Tiers
  const tierRepo = ds.getRepository('RechargeTier');
  if ((await tierRepo.count()) === 0) {
    await tierRepo.save([
      { price: 6, credits: 60, bonus: 0, is_popular: false, sort_order: 0 },
      { price: 18, credits: 180, bonus: 10, is_popular: false, sort_order: 1 },
      { price: 30, credits: 300, bonus: 30, is_popular: false, sort_order: 2 },
      { price: 68, credits: 680, bonus: 100, is_popular: true, sort_order: 3 },
      { price: 128, credits: 1280, bonus: 280, is_popular: false, sort_order: 4 },
    ]);
    console.log('Recharge tiers seeded');
  }

  // Member Plans
  const planRepo = ds.getRepository('MemberPlan');
  if ((await planRepo.count()) === 0) {
    await planRepo.save([
      { name: 'monthly', display_name: '月卡', price: 18, daily_credits: 50, benefits: '每日领取50积分 · 共1500积分', sort_order: 0 },
      { name: 'quarterly', display_name: '季卡', price: 48, daily_credits: 50, benefits: '每日领取50积分 · 共4500积分', sort_order: 1 },
      { name: 'yearly', display_name: '年卡', price: 168, daily_credits: 50, benefits: '每日领取50积分 · 共18000积分', sort_order: 2 },
    ]);
    console.log('Member plans seeded');
  }

  // Checkin Milestones
  const msRepo = ds.getRepository('CheckinMilestone');
  if ((await msRepo.count()) === 0) {
    await msRepo.save([
      { consecutive_days: 3, reward_credits: 20 }, { consecutive_days: 7, reward_credits: 50 },
      { consecutive_days: 14, reward_credits: 100 }, { consecutive_days: 30, reward_credits: 300 },
    ]);
    console.log('Checkin milestones seeded');
  }

  console.log('Seed complete!');
  await ds.destroy();
}

seed().catch(e => { console.error(e); process.exit(1); });
