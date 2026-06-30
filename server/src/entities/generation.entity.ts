import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('generations')
export class Generation {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column({ default: '' }) model: string;
  @Column({ type: 'text', default: '' }) prompt: string;
  @Column({ default: 'pending' }) status: string; // pending, processing, success, failed
  @Column({ type: 'jsonb', default: [] }) result_urls: string[];
  @Column({ type: 'int', default: 0 }) credits_used: number;
  @Column({ nullable: true }) kie_task_id: string;
  @Column({ default: '' }) style: string;
  @Column({ default: '' }) aspect_ratio: string;
  @Column({ default: '1K' }) resolution: string;
  @Column({ type: 'int', default: 1 }) count: number;
  @CreateDateColumn() created_at: Date;
}
