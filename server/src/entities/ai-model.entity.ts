import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('ai_models')
export class AiModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) kie_model: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) description: string;
  @Column({ type: 'jsonb', default: [] }) tags: string[];
  @Column({ type: 'int', default: 0 }) credits_cost: number;
  @Column({ default: '' }) cover_url: string;
  @Column({ default: '' }) badge: string;
  @Column({ default: '' }) badge_color: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
