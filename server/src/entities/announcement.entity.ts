import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) title: string;
  @Column({ type: 'text', default: '' }) content: string;
  @Column({ default: '' }) scope: string; // all, active, new
  @Column({ default: 'draft' }) status: string; // draft, published, scheduled
  @Column({ default: false }) popup: boolean;
  @Column({ default: '' }) button_text: string;
  @Column({ default: '' }) link_url: string;
  @Column({ default: '' }) cover_url: string;
  @Column({ type: 'timestamp', nullable: true }) scheduled_at: Date;
  @CreateDateColumn() created_at: Date;
}
