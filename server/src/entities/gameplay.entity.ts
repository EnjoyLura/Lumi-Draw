import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('gameplays')
export class Gameplay {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) cover_url: string;
  @Column({ default: '0' }) uses_count: string;
  @Column({ default: false }) is_hot: boolean;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
