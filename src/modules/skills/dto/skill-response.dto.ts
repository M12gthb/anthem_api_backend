// src/modules/skills/dto/skill-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// só sai o que tem @Expose(): o created_by não aparece na API
export class SkillResponseDto {
  @ApiProperty({ example: '3f1c0000-0000-4000-8000-000000000000', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'NestJS' })
  @Expose()
  name: string;
}