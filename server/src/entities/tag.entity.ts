import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) category: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
}
