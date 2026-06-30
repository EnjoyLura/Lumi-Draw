import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';
@Entity('follows')
@Unique(['follower_id', 'following_id'])
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() follower_id: string;
  @Column() following_id: string;
  @CreateDateColumn() created_at: Date;
}
