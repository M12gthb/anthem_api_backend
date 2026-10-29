import * as typeorm from 'typeorm';

import { Skill } from '../../skills/entities/skill.entity.js';

export enum SeniorityLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

@typeorm.Entity('users')
export class User {
  @typeorm.PrimaryGeneratedColumn('uuid')
  id: string;

  @typeorm.Column({ type: 'varchar', length: 255 })
  username: string;

  @typeorm.Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @typeorm.Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @typeorm.Column({
    type: 'enum',
    enum: SeniorityLevel,
    enumName: 'seniority_level',
    nullable: true,
  })
  seniority: SeniorityLevel | null;

  @typeorm.Column({ name: 'current_position', type: 'varchar', nullable: true })
  currentPosition: string | null;

  @typeorm.Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @typeorm.Column({
    name: 'favorite_phrase',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  favoritePhrase: string | null;

  @typeorm.CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @typeorm.UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @typeorm.DeleteDateColumn({ name: 'deletedAt' })
  deletedAt: Date | null;

  @typeorm.ManyToMany(() => Skill)
  @typeorm.JoinTable({
    name: 'user_skill',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: typeorm.Relation<Skill[]>;
}