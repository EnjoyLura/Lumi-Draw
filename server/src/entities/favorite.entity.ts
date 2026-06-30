import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';
@Entity('favorites')
@Unique(['user_id', 'work_id'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column() work_id: string;
  @CreateDateColumn() created_at: Date;
}
