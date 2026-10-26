// src/modules/users/dto/create-user.dto.ts
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
import { SeniorityLevel } from '../entities/user.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // o bcrypt ignora tudo depois de 72 bytes
  password: string;

  @IsOptional()
  @IsEnum(SeniorityLevel)
  seniority?: SeniorityLevel;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  currentPosition?: string;

  @IsOptional()
  @IsISO8601({ strict: true }) // aceita "1998-05-23", rejeita "1998-02-31"
  birthDate?: string;
}