import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['birthDate', 'confirmPassword'] as const),
) {
  @ApiPropertyOptional({
    example: 'Senha12345',
    description: 'Obrigatório quando `password` é enviado; deve ser idêntico a ele',
  })
  
  @ValidateIf(
    (dto: UpdateUserDto) =>
      dto.password !== undefined || dto.confirmPassword !== undefined,
  )
  @IsString()
  @Match('password')
  confirmPassword?: string;

  @ApiPropertyOptional({
    example: 'Senha12345',
    description: 'Obrigatória quando `password` é enviado',
  })
  
  @ValidateIf((dto: UpdateUserDto) => dto.password !== undefined)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;
}