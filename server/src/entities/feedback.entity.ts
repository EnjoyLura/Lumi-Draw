import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column({ default: '' }) type: string; // bug, experience, suggestion
  @Column({ type: 'text', default: '' }) content: string;
  @Column({ type: 'jsonb', default: [] }) screenshots: string[];
  @Column({ default: '' }) wechat_id: string;
  @Column({ default: 'pending' }) status: string; // pending, adopted, done, ignored
  @CreateDateColumn() created_at: Date;
}
