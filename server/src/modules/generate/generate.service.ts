import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Generation, User, AiModel, Transaction } from '../../entities';
import axios from 'axios';

@Injectable()
export class GenerateService {
  constructor(
    @InjectRepository(Generation) private readonly genRepo: Repository<Generation>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AiModel) private readonly modelRepo: Repository<AiModel>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, data: { model: string; prompt: string; style?: string; aspect_ratio?: string; resolution?: string; count?: number }) {
    const aiModel = await this.modelRepo.findOne({ where: { kie_model: data.model } });
    const cost = aiModel?.credits_cost || 15;
    const totalCost = cost * (data.count || 1);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if ((user?.credits || 0) < totalCost) throw new BadRequestException('积分不足');

    await this.userRepo.update(userId, { credits: () => `credits - ${totalCost}` });
    await this.txRepo.save(this.txRepo.create({
      user_id: userId, type: 'expense', channel: 'create',
      credits_change: -totalCost, balance_after: (user?.credits || 0) - totalCost,
      remark: `创作消耗 (${aiModel?.name || data.model} × ${data.count || 1}张)`,
    }));

    const gen = this.genRepo.create({
      user_id: userId, model: data.model, prompt: data.prompt,
      style: data.style || '', aspect_ratio: data.aspect_ratio || '1:1',
      resolution: data.resolution || '1K', count: data.count || 1,
      credits_used: totalCost, status: 'pending',
    });
    const saved = await this.genRepo.save(gen);

    // Call KIE.AI
    try {
      const kieBase = this.configService.get('KIE_API_BASE');
      const kieKey = this.configService.get('KIE_API_KEY');
      const callbackUrl = this.configService.get('KIE_CALLBACK_URL');
      const res = await axios.post(`${kieBase}/api/v1/jobs/createTask`, {
        model: data.model, prompt: data.prompt,
        size: data.aspect_ratio || '1:1', quality: data.resolution || '1K', n: data.count || 1,
        callBackUrl: callbackUrl, taskId: saved.id,
      }, { headers: { Authorization: `Bearer ${kieKey}`, 'Content-Type': 'application/json' } });
      if (res.data?.taskId) {
        await this.genRepo.update(saved.id, { kie_task_id: res.data.taskId, status: 'processing' });
      }
    } catch (e) {
      // KIE call failed, mark as failed (credits already deducted)
      await this.genRepo.update(saved.id, { status: 'failed' });
    }

    return { id: saved.id, status: 'pending' };
  }

  async getStatus(id: string) {
    const gen = await this.genRepo.findOne({ where: { id } });
    if (!gen) throw new BadRequestException('任务不存在');
    return { status: gen.status, result_urls: gen.result_urls };
  }

  async handleCallback(taskId: string, result: any) {
    const gen = await this.genRepo.findOne({ where: { kie_task_id: taskId } }) || await this.genRepo.findOne({ where: { id: taskId } });
    if (!gen) return { error: 'task not found' };
    const urls = result?.images || result?.result_urls || [];
    await this.genRepo.update(gen.id, { status: 'success', result_urls: urls });
    return { success: true };
  }

  async reversePrompt(imageUrl: string) {
    try {
      const kieBase = this.configService.get('KIE_API_BASE');
      const kieKey = this.configService.get('KIE_API_KEY');
      const res = await axios.post(`${kieBase}/api/v1/jobs/createTask`, {
        model: 'gpt-image-2', prompt: 'Describe this image in detail as a prompt for AI image generation',
        image: imageUrl,
      }, { headers: { Authorization: `Bearer ${kieKey}` } });
      return { prompt: res.data?.result || 'a beautiful image' };
    } catch {
      return { prompt: 'a beautiful anime illustration, detailed, high quality' };
    }
  }
}
