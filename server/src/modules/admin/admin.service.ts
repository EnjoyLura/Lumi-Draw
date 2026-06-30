import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User, Work, Generation, Transaction, Feedback, Report, Announcement,
  Banner, Gameplay, AiModel, Style, HotSearch, RechargeTier, MemberPlan, CheckinMilestone,
} from '../../entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Work) private readonly workRepo: Repository<Work>,
    @InjectRepository(Generation) private readonly genRepo: Repository<Generation>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Feedback) private readonly fbRepo: Repository<Feedback>,
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
    @InjectRepository(Announcement) private readonly annRepo: Repository<Announcement>,
    @InjectRepository(Banner) private readonly bannerRepo: Repository<Banner>,
    @InjectRepository(Gameplay) private readonly gpRepo: Repository<Gameplay>,
    @InjectRepository(AiModel) private readonly modelRepo: Repository<AiModel>,
    @InjectRepository(Style) private readonly styleRepo: Repository<Style>,
    @InjectRepository(HotSearch) private readonly hsRepo: Repository<HotSearch>,
    @InjectRepository(RechargeTier) private readonly tierRepo: Repository<RechargeTier>,
    @InjectRepository(MemberPlan) private readonly planRepo: Repository<MemberPlan>,
    @InjectRepository(CheckinMilestone) private readonly msRepo: Repository<CheckinMilestone>,
  ) {}

  async getDashboard() {
    const totalUsers = await this.userRepo.count();
    const totalWorks = await this.workRepo.count();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayUsers = await this.userRepo.createQueryBuilder('u').where('u.created_at >= :today', { today }).getCount();
    const todayGens = await this.genRepo.createQueryBuilder('g').where('g.created_at >= :today', { today }).getCount();
    const totalIncome = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'sum').where('t.type = :type', { type: 'income' }).getRawOne();
    const todayIncome = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'sum').where('t.type = :type AND t.created_at >= :today', { type: 'income', today }).getRawOne();
    return {
      total_users: totalUsers, today_new_users: todayUsers, total_works: totalWorks, today_generations: todayGens,
      total_income: +totalIncome?.sum || 0, today_income: +todayIncome?.sum || 0,
    };
  }

  getUsers(params: any) {
    const { search, status, page = 1 } = params;
    const take = 20, skip = ((+page) - 1) * take;
    const qb = this.userRepo.createQueryBuilder('u');
    if (search) qb.andWhere('u.nickname ILIKE :s', { s: `%${search}%` });
    if (status) qb.andWhere('u.status = :status', { status });
    qb.orderBy('u.created_at', 'DESC').take(take).skip(skip);
    return qb.getManyAndCount().then(([list, total]) => ({ list, total }));
  }

  async updateUserStatus(id: string, status: string) { await this.userRepo.update(id, { status }); return { success: true }; }

  getWorks(params: any) {
    const { status, search, page = 1 } = params;
    const take = 20, skip = ((+page) - 1) * take;
    const qb = this.workRepo.createQueryBuilder('w');
    if (status) qb.andWhere('w.status = :status', { status });
    if (search) qb.andWhere('w.title ILIKE :s', { s: `%${search}%` });
    qb.orderBy('w.created_at', 'DESC').take(take).skip(skip);
    return qb.getManyAndCount().then(([list, total]) => ({ list, total }));
  }

  async updateWorkStatus(id: string, status: string) { await this.workRepo.update(id, { status }); return { success: true }; }
  async toggleFeatured(id: string) {
    const w = await this.workRepo.findOne({ where: { id } });
    if (w) await this.workRepo.update(id, { is_featured: !w.is_featured });
    return { success: true };
  }

  getReports() { return this.reportRepo.find({ order: { created_at: 'DESC' } }); }
  async handleReport(id: string, status: string) { await this.reportRepo.update(id, { status }); return { success: true }; }

  getFeedbacks() { return this.fbRepo.find({ order: { created_at: 'DESC' } }); }
  async handleFeedback(id: string, status: string) { await this.fbRepo.update(id, { status }); return { success: true }; }

  // CRUD for config entities
  getBanners() { return this.bannerRepo.find({ order: { sort_order: 'ASC' } }); }
  createBanner(data: Partial<Banner>) { return this.bannerRepo.save(this.bannerRepo.create(data)); }
  updateBanner(id: string, data: Partial<Banner>) { return this.bannerRepo.update(id, data).then(() => this.bannerRepo.findOne({ where: { id } })); }
  deleteBanner(id: string) { return this.bannerRepo.delete(id).then(() => ({ success: true })); }

  getGameplays() { return this.gpRepo.find({ order: { sort_order: 'ASC' } }); }
  createGameplay(data: Partial<Gameplay>) { return this.gpRepo.save(this.gpRepo.create(data)); }
  updateGameplay(id: string, data: Partial<Gameplay>) { return this.gpRepo.update(id, data).then(() => this.gpRepo.findOne({ where: { id } })); }
  deleteGameplay(id: string) { return this.gpRepo.delete(id).then(() => ({ success: true })); }

  getModels() { return this.modelRepo.find({ order: { sort_order: 'ASC' } }); }
  createModel(data: Partial<AiModel>) { return this.modelRepo.save(this.modelRepo.create(data)); }
  updateModel(id: string, data: Partial<AiModel>) { return this.modelRepo.update(id, data).then(() => this.modelRepo.findOne({ where: { id } })); }
  deleteModel(id: string) { return this.modelRepo.delete(id).then(() => ({ success: true })); }

  getStyles() { return this.styleRepo.find({ order: { sort_order: 'ASC' } }); }
  createStyle(data: Partial<Style>) { return this.styleRepo.save(this.styleRepo.create(data)); }
  deleteStyle(id: string) { return this.styleRepo.delete(id).then(() => ({ success: true })); }

  getHotSearches() { return this.hsRepo.find({ order: { sort_order: 'ASC' } }); }
  createHotSearch(data: Partial<HotSearch>) { return this.hsRepo.save(this.hsRepo.create(data)); }
  updateHotSearch(id: string, data: Partial<HotSearch>) { return this.hsRepo.update(id, data).then(() => this.hsRepo.findOne({ where: { id } })); }
  deleteHotSearch(id: string) { return this.hsRepo.delete(id).then(() => ({ success: true })); }

  getRechargeTiers() { return this.tierRepo.find({ order: { sort_order: 'ASC' } }); }
  createRechargeTier(data: Partial<RechargeTier>) { return this.tierRepo.save(this.tierRepo.create(data)); }
  updateRechargeTier(id: string, data: Partial<RechargeTier>) { return this.tierRepo.update(id, data).then(() => this.tierRepo.findOne({ where: { id } })); }

  getMemberPlans() { return this.planRepo.find({ order: { sort_order: 'ASC' } }); }
  updateMemberPlan(id: string, data: Partial<MemberPlan>) { return this.planRepo.update(id, data).then(() => this.planRepo.findOne({ where: { id } })); }

  getCheckinMilestones() { return this.msRepo.find({ order: { consecutive_days: 'ASC' } }); }
  updateCheckinMilestone(id: string, data: Partial<CheckinMilestone>) { return this.msRepo.update(id, data).then(() => this.msRepo.findOne({ where: { id } })); }

  getAllTransactions(params: any) {
    const { search, type, page = 1 } = params;
    const take = 20, skip = ((+page) - 1) * take;
    const qb = this.txRepo.createQueryBuilder('t');
    if (type && type !== 'all') qb.andWhere('t.type = :type', { type });
    if (search) qb.andWhere('t.remark ILIKE :s', { s: `%${search}%` });
    qb.orderBy('t.created_at', 'DESC').take(take).skip(skip);
    return qb.getManyAndCount().then(([list, total]) => ({ list, total }));
  }

  getAnnouncements() { return this.annRepo.find({ order: { created_at: 'DESC' } }); }
  createAnnouncement(data: Partial<Announcement>) { return this.annRepo.save(this.annRepo.create(data)); }
  updateAnnouncement(id: string, data: Partial<Announcement>) { return this.annRepo.update(id, data).then(() => this.annRepo.findOne({ where: { id } })); }
  deleteAnnouncement(id: string) { return this.annRepo.delete(id).then(() => ({ success: true })); }
}
