// invalid-current-password.error.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidCurrentPasswordError extends BadRequestException {
  constructor() {
    super('Incorrect current password');
  }
}