import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('recharge_tiers')
export class RechargeTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'int' }) price: number;
  @Column({ type: 'int' }) credits: number;
  @Column({ type: 'int', default: 0 }) bonus: number;
  @Column({ default: false }) is_popular: boolean;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
