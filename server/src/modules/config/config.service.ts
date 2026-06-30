import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner, Gameplay, AiModel, Style, Tag, HotSearch } from '../../entities';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Banner) private readonly bannerRepo: Repository<Banner>,
    @InjectRepository(Gameplay) private readonly gameplayRepo: Repository<Gameplay>,
    @InjectRepository(AiModel) private readonly modelRepo: Repository<AiModel>,
    @InjectRepository(Style) private readonly styleRepo: Repository<Style>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(HotSearch) private readonly hotSearchRepo: Repository<HotSearch>,
  ) {}

  getBanners() { return this.bannerRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
  getGameplays() { return this.gameplayRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
  getModels() { return this.modelRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
  getStyles() { return this.styleRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
  getTags() { return this.tagRepo.find({ order: { sort_order: 'ASC' } }); }
  getHotSearches() { return this.hotSearchRepo.find({ where: { enabled: true }, order: { sort_order: 'ASC' } }); }
}
