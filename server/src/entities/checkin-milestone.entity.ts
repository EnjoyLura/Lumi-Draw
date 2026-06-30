import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('checkin_milestones')
export class CheckinMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'int' }) consecutive_days: number;
  @Column({ type: 'int', default: 0 }) reward_credits: number;
  @Column({ default: true }) enabled: boolean;
}
