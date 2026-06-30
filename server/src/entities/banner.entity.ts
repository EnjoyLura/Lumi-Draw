import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) title: string;
  @Column({ default: '' }) image_url: string;
  @Column({ default: '' }) link_url: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ default: true }) enabled: boolean;
}
