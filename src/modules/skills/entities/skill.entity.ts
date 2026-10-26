// src/modules/skills/entities/skill.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skill')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  // id de quem criou a habilidade (só esse usuário pode removê-la)
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;
}