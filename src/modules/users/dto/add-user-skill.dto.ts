// src/modules/users/dto/add-user-skill.dto.ts
import { IsUUID } from 'class-validator';

export class AddUserSkillDto {
  @IsUUID()
  skillId: string;
}