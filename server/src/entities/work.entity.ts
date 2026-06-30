import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('works')
export class Work {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  image_urls: string[];

  @Column({ default: '' })
  model: string;

  @Column({ default: '' })
  style: string;

  @Column({ default: '' })
  aspect_ratio: string;

  @Column({ default: '1K' })
  resolution: string;

  @Column({ type: 'text', default: '' })
  prompt: string;

  @Column({ default: 'draft' })
  status: string; // draft, pending, published, rejected, removed

  @Column({ default: false })
  is_featured: boolean;

  @Column({ type: 'int', default: 0 })
  likes_count: number;

  @Column({ type: 'int', default: 0 })
  favorites_count: number;

  @Column({ type: 'int', default: 0 })
  remakes_count: number;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.works)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
