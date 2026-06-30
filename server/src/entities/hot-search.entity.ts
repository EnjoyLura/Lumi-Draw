import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('hot_searches')
export class HotSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) keyword: string;
  @Column({ type: 'int', default: 0 }) volume: number;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
