// src/modules/users/dto/user-response.dto.ts
import { Expose } from 'class-transformer';
import { SeniorityLevel } from '../entities/user.entity.js';

export class UserResponseDto {
  @Expose() id: string;
  @Expose() username: string;
  @Expose() email: string;
  @Expose() seniority: SeniorityLevel | null;
  @Expose() currentPosition: string | null;
  @Expose() birthDate: string | null;
  @Expose() createdAt: Date;
}