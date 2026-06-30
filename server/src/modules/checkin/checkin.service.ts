import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkin, CheckinMilestone, User, Transaction } from '../../entities';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(Checkin) private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(CheckinMilestone) private readonly milestoneRepo: Repository<CheckinMilestone>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  async getStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const today = new Date().toISOString().split('T')[0];
    const todayCheckin = await this.checkinRepo.findOne({ where: { user_id: userId, checkin_date: today } });
    return { checked_today: !!todayCheckin, streak: user?.checkin_streak || 0 };
  }

  async doCheckin(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const exists = await this.checkinRepo.findOne({ where: { user_id: userId, checkin_date: today } });
    if (exists) throw new BadRequestException('今日已签到');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const lastDate = user?.last_checkin_at ? new Date(user.last_checkin_at).toISOString().split('T')[0] : '';
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = lastDate === yesterday ? (user?.checkin_streak || 0) + 1 : 1;

    await this.checkinRepo.save(this.checkinRepo.create({ user_id: userId, checkin_date: today, streak: newStreak, credits_earned: 10 }));
    await this.userRepo.update(userId, { checkin_streak: newStreak, last_checkin_at: new Date(), credits: () => 'credits + 10' });

    // Check milestones
    const milestones = await this.milestoneRepo.find({ where: { enabled: true } });
    for (const m of milestones) {
      if (m.consecutive_days === newStreak) {
        await this.userRepo.update(userId, { credits: () => `credits + ${m.reward_credits}` });
      }
    }

    await this.txRepo.save(this.txRepo.create({ user_id: userId, type: 'income', channel: 'checkin', credits_change: 10, balance_after: (user?.credits || 0) + 10, remark: '每日签到' }));
    return { credits_earned: 10, streak: newStreak };
  }

  getMilestones() { return this.milestoneRepo.find({ where: { enabled: true }, order: { consecutive_days: 'ASC' } }); }
}
