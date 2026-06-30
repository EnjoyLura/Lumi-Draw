import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';
@Entity('likes')
@Unique(['user_id', 'work_id'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() user_id: string;
  @Column() work_id: string;
  @CreateDateColumn() created_at: Date;
}
