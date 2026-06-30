import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column({ default: '' }) type: string; // income, expense
  @Column({ default: '' }) channel: string; // recharge, create, checkin, invite
  @Column({ type: 'int', default: 0 }) credits_change: number;
  @Column({ type: 'int', default: 0 }) balance_after: number;
  @Column({ type: 'decimal', nullable: true }) amount: number;
  @Column({ default: '' }) remark: string;
  @CreateDateColumn() created_at: Date;
}
