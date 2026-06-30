import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RechargeTier, MemberPlan, Transaction, User } from '../../entities';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(RechargeTier) private readonly tierRepo: Repository<RechargeTier>,
    @InjectRepository(MemberPlan) private readonly planRepo: Repository<MemberPlan>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  getRechargeTiers() { return this.tierRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
  getMemberPlans() { return this.planRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }

  async getTransactions(userId: string, type: string) {
    const where: any = { user_id: userId };
    if (type && type !== 'all') where.type = type === 'earn' ? 'income' : 'expense';
    return this.txRepo.find({ where, order: { created_at: 'DESC' } });
  }

  async recharge(userId: string, tierId: string) {
    const tier = await this.tierRepo.findOne({ where: { id: tierId } });
    if (!tier) return { error: '充值档位不存在' };
    const totalCredits = tier.credits + tier.bonus;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    await this.userRepo.update(userId, { credits: () => `credits + ${totalCredits}` });
    await this.txRepo.save(this.txRepo.create({
      user_id: userId, type: 'income', channel: 'recharge',
      credits_change: totalCredits, balance_after: (user?.credits || 0) + totalCredits,
      amount: tier.price, remark: `充值 ¥${tier.price}`,
    }));
    return { credits_added: totalCredits, price: tier.price };
  }
}
