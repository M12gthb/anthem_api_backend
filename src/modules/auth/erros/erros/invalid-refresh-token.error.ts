// src/modules/auth/erros/invalid-refresh-token.error.ts
import { UnauthorizedException } from '@nestjs/common';

export class InvalidRefreshTokenError extends UnauthorizedException {
  constructor() {
    super('Invalid or expired refresh token');
  }
}