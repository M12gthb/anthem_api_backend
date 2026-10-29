// src/modules/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { SeniorityLevel } from '../entities/user.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @ApiProperty({ example: 'Matheus' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'matheus@email.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Senha12345', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // o bcrypt ignora tudo depois de 72 bytes
  password: string;

  @ApiProperty({
    example: 'Senha12345',
    description: 'Deve ser idêntica a password',
  })
  @IsString()
  @Match('password') // a comparação diferencia maiúsculas de minúsculas
  confirmPassword: string;

  @ApiPropertyOptional({ enum: SeniorityLevel, example: SeniorityLevel.JUNIOR })
  @IsOptional()
  @IsEnum(SeniorityLevel)
  seniority?: SeniorityLevel;

  @ApiPropertyOptional({ example: 'Desenvolvedor Backend' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  currentPosition?: string;

  @ApiPropertyOptional({
    example: 'Carpe diem',
    maxLength: 255,
    description: 'Frase favorita do usuário',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  favoritePhrase?: string;

  @ApiPropertyOptional({ example: '1998-05-23', description: 'Formato AAAA-MM-DD' })
  @IsOptional()
  @IsISO8601({ strict: true }) // aceita "1998-05-23", rejeita "1998-02-31"
  birthDate?: string;
}