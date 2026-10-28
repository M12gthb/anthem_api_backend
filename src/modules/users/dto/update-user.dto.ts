import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['birthDate'] as const),
) {
  @ApiPropertyOptional({
    example: 'Senha12345',
    description: 'Obrigatória quando `password` é enviado',
  })
  // obrigatória só quando o corpo traz uma senha nova
  @ValidateIf((dto: UpdateUserDto) => dto.password !== undefined)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;
}