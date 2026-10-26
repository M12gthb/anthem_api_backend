// src/modules/skills/dto/create-skill.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({
    example: 'NestJS',
    maxLength: 100,
    description: 'Nome da habilidade (não diferencia maiúsculas de minúsculas)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}