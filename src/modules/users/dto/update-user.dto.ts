// src/modules/users/dto/update-user.dto.ts
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {
  // obrigatória só quando o corpo traz uma senha nova
  @ValidateIf((dto: UpdateUserDto) => dto.password !== undefined)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;
}