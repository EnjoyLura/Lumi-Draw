import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Work } from './work.entity';
import { Transaction } from './transaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  openid: string;

  @Column({ default: '' })
  nickname: string;

  @Column({ default: '' })
  avatar_url: string;

  @Column({ default: 0 })
  gender: number; // 0未知 1男 2女

  @Column({ default: '' })
  signature: string;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ default: '' })
  member_type: string;

  @Column({ type: 'timestamp', nullable: true })
  member_expires_at: Date;

  @Column({ unique: true })
  invite_code: string;

  @Column({ default: 'active' })
  status: string; // active, banned

  @Column({ type: 'int', default: 0 })
  works_count: number;

  @Column({ type: 'int', default: 0 })
  followers_count: number;

  @Column({ type: 'int', default: 0 })
  following_count: number;

  @Column({ type: 'int', default: 0 })
  likes_count: number;

  @Column({ type: 'int', default: 0 })
  checkin_streak: number;

  @Column({ type: 'date', nullable: true })
  last_checkin_at: Date;

  @Column({ default: '' })
  phone: string;

  @Column({ default: '' })
  admin_username: string;

  @Column({ default: '' })
  admin_password: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Work, (work) => work.user)
  works: Work[];
}
