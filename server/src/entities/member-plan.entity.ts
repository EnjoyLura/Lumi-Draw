import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('member_plans')
export class MemberPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) name: string; // monthly, quarterly, yearly
  @Column({ default: '' }) display_name: string;
  @Column({ type: 'int' }) price: number;
  @Column({ type: 'int', default: 0 }) daily_credits: number;
  @Column({ default: '' }) benefits: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
