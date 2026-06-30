import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as TypeOrmLike } from 'typeorm';
import { Work, Like, Favorite, User } from '../../entities';

@Injectable()
export class WorkService {
  constructor(
    @InjectRepository(Work) private readonly workRepo: Repository<Work>,
    @InjectRepository(Like) private readonly likeRepo: Repository<Like>,
    @InjectRepository(Favorite) private readonly favRepo: Repository<Favorite>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getHomeWorks(tab: string, page: number) {
    const take = 10;
    const skip = (page - 1) * take;
    const where: any = { status: 'published' };
    if (tab === 'recommend') where.is_featured = true;
    const order = tab === 'new' ? { created_at: 'DESC' } : { likes_count: 'DESC' };
    const [list, total] = await this.workRepo.findAndCount({ where, order: order as any, take, skip });
    return { list, total };
  }

  async getPlazaWorks(params: any) {
    const { tab = 'recommend', category, model, style, sort, page = 1 } = params;
    const take = 10;
    const skip = ((+page) - 1) * take;
    const where: any = { status: 'published' };
    if (category && category !== '全部') where.style = category;
    if (model) where.model = model;
    if (style) where.style = style;
    let order: any = { created_at: 'DESC' };
    if (sort === 'likes') order = { likes_count: 'DESC' };
    if (tab === 'hot') order = { likes_count: 'DESC' };
    const [list, total] = await this.workRepo.findAndCount({ where, order, take, skip });
    return { list, total };
  }

  async getMyWorks(userId: string) {
    const published = await this.workRepo.find({ where: { user_id: userId, status: 'published' }, order: { created_at: 'DESC' } });
    const drafts = await this.workRepo.find({ where: { user_id: userId, status: 'draft' }, order: { created_at: 'DESC' } });
    return { published, drafts };
  }

  async getWorkDetail(id: string) {
    const work = await this.workRepo.findOne({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    return work;
  }

  async searchWorks(keyword: string) {
    const list = await this.workRepo.find({
      where: [
        { title: TypeOrmLike(`%${keyword}%`), status: 'published' },
        { prompt: TypeOrmLike(`%${keyword}%`), status: 'published' },
      ],
      take: 20,
      order: { likes_count: 'DESC' },
    });
    return { list };
  }

  async likeWork(userId: string, workId: string) {
    const existing = await this.likeRepo.findOne({ where: { user_id: userId, work_id: workId } });
    if (existing) {
      await this.likeRepo.remove(existing);
      await this.workRepo.decrement({ id: workId }, 'likes_count', 1);
      return { liked: false };
    }
    await this.likeRepo.save(this.likeRepo.create({ user_id: userId, work_id: workId }));
    await this.workRepo.increment({ id: workId }, 'likes_count', 1);
    return { liked: true };
  }

  async favoriteWork(userId: string, workId: string) {
    const existing = await this.favRepo.findOne({ where: { user_id: userId, work_id: workId } });
    if (existing) {
      await this.favRepo.remove(existing);
      await this.workRepo.decrement({ id: workId }, 'favorites_count', 1);
      return { favorited: false };
    }
    await this.favRepo.save(this.favRepo.create({ user_id: userId, work_id: workId }));
    await this.workRepo.increment({ id: workId }, 'favorites_count', 1);
    return { favorited: true };
  }

  async publishWork(userId: string, data: Partial<Work>) {
    const work = this.workRepo.create({ ...data, user_id: userId, status: 'published', published_at: new Date() });
    const saved = await this.workRepo.save(work);
    await this.userRepo.increment({ id: userId }, 'works_count', 1);
    return saved;
  }

  async deleteWork(userId: string, workId: string) {
    const work = await this.workRepo.findOne({ where: { id: workId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.user_id !== userId) throw new ForbiddenException('无权操作');
    await this.workRepo.remove(work);
    if (work.status === 'published') {
      await this.userRepo.decrement({ id: userId }, 'works_count', 1);
    }
    return { success: true };
  }
}
