import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() reporter_id: string;
  @Column({ default: '' }) target_type: string; // work, user, comment
  @Column({ nullable: true }) target_id: string;
  @Column({ default: '' }) reason: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ default: 'pending' }) status: string; // pending, handled, ignored
  @CreateDateColumn() created_at: Date;
}
