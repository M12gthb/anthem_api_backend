import * as typeorm from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

@typeorm.Entity('refresh_tokens')
export class RefreshToken {
  @typeorm.PrimaryGeneratedColumn('uuid')
  id: string;

  @typeorm.Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @typeorm.ManyToOne(() => User, { onDelete: 'CASCADE' })
  @typeorm.JoinColumn({ name: 'user_id' })
  user: typeorm.Relation<User>;

  @typeorm.Index({ unique: true })
  @typeorm.Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @typeorm.Index()
  @typeorm.Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @typeorm.Column({ name: 'token_version', type: 'int' })
  tokenVersion: number;

  @typeorm.Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @typeorm.Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @typeorm.CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}