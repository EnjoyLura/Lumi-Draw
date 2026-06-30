import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Follow } from '../../entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: string, data: Partial<User>) {
    await this.userRepo.update(userId, {
      nickname: data.nickname,
      gender: data.gender,
      signature: data.signature,
      avatar_url: data.avatar_url,
    });
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async getCredits(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'credits'] });
    return { credits: user?.credits || 0 };
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({ where: { id }, select: ['id', 'nickname', 'avatar_url', 'gender', 'signature', 'works_count', 'followers_count', 'following_count', 'likes_count', 'created_at'] });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async follow(userId: string, targetId: string) {
    const existing = await this.followRepo.findOne({ where: { follower_id: userId, following_id: targetId } });
    if (!existing) {
      await this.followRepo.save(this.followRepo.create({ follower_id: userId, following_id: targetId }));
      await this.userRepo.increment({ id: userId }, 'following_count', 1);
      await this.userRepo.increment({ id: targetId }, 'followers_count', 1);
    }
    return { followed: true };
  }

  async unfollow(userId: string, targetId: string) {
    const existing = await this.followRepo.findOne({ where: { follower_id: userId, following_id: targetId } });
    if (existing) {
      await this.followRepo.remove(existing);
      await this.userRepo.decrement({ id: userId }, 'following_count', 1);
      await this.userRepo.decrement({ id: targetId }, 'followers_count', 1);
    }
    return { followed: false };
  }

  async getFollowList(userId: string, type: string) {
    if (type === 'following') {
      const follows = await this.followRepo.find({ where: { follower_id: userId } });
      const ids = follows.map(f => f.following_id);
      return ids.length ? this.userRepo.findByIds(ids) : [];
    } else {
      const follows = await this.followRepo.find({ where: { following_id: userId } });
      const ids = follows.map(f => f.follower_id);
      return ids.length ? this.userRepo.findByIds(ids) : [];
    }
  }
}
