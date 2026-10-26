// src/modules/skills/dto/skills-page-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SkillResponseDto } from './skill-response.dto.js';

export class SkillsPageResponseDto {
  @ApiProperty({ type: [SkillResponseDto] })
  data: SkillResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de habilidades cadastradas' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}