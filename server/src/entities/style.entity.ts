import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('styles')
export class Style {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) image_url: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
