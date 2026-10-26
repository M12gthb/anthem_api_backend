// src/common/dto/id-param.dto.ts
import { IsUUID } from 'class-validator';

export class IdParamDto {
  @IsUUID()
  id: string;
}