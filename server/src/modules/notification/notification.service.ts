import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, Invite, User } from '../../entities';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    @InjectRepository(Invite) private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getCategories(userId: string) {
    const types = ['like', 'favorite', 'follow', 'remake', 'system', 'service'];
    const result: any[] = [];
    for (const type of types) {
      const msgs = await this.msgRepo.find({ where: { user_id: userId, type }, order: { created_at: 'DESC' } });
      result.push({ key: type, unread: msgs.filter(m => !m.is_read).length, latest: msgs[0] || null });
    }
    return result;
  }

  async getByType(userId: string, type: string) {
    return this.msgRepo.find({ where: { user_id: userId, type }, order: { created_at: 'DESC' } });
  }

  async markRead(msgId: string) {
    await this.msgRepo.update(msgId, { is_read: true });
    return { success: true };
  }

  async getInviteInfo(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const records = await this.inviteRepo.find({ where: { inviter_id: userId } });
    const invitees = records.length ? await this.userRepo.findByIds(records.map(r => r.invitee_id)) : [];
    return {
      invite_code: user?.invite_code || '',
      records: invitees.map((u, i) => ({ user_id: u.id, nickname: u.nickname, created_at: records[i]?.created_at })),
      count: records.length,
    };
  }
}
