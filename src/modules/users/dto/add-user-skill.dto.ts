import { IsUUID } from 'class-validator';

export class AddUserSkillDto {
  @IsUUID()
  skillId: string;
}