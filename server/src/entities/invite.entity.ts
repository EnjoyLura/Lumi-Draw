import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() inviter_id: string;
  @Column() invitee_id: string;
  @CreateDateColumn() created_at: Date;
}
