// email-already-in-use.error.ts
import { ConflictException } from '@nestjs/common';

export class EmailAlreadyInUseError extends ConflictException {
  constructor() {
    super('This email address is already in use');
  }
}