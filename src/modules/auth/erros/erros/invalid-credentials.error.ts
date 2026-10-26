// src/modules/auth/erros/invalid-credentials.error.ts
import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsError extends UnauthorizedException {
  constructor() {
    super('Credenciais inválidas');
  }
}