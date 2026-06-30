import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column({ default: '' }) type: string; // like, favorite, follow, remake, system, service
  @Column({ default: '' }) title: string;
  @Column({ type: 'text', default: '' }) content: string;
  @Column({ default: false }) is_read: boolean;
  @Column({ nullable: true }) related_id: string;
  @Column({ nullable: true }) from_user: string;
  @CreateDateColumn() created_at: Date;
}
