// dto/skill-response.dto.ts
import { Expose } from 'class-transformer';

// só sai o que tem @Expose(): o created_by não aparece na API
export class SkillResponseDto {
  @Expose() id: string;
  @Expose() name: string;
}