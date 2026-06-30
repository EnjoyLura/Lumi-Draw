import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('checkins')
export class Checkin {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column({ type: 'date' }) checkin_date: string;
  @Column({ type: 'int', default: 1 }) streak: number;
  @Column({ type: 'int', default: 10 }) credits_earned: number;
  @CreateDateColumn() created_at: Date;
}
