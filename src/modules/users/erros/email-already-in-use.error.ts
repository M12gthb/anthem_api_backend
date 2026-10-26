// email-already-in-use.error.ts
import { ConflictException } from '@nestjs/common';

export class EmailAlreadyInUseError extends ConflictException {
  constructor() {
    super('E-mail já cadastrado');
  }
}