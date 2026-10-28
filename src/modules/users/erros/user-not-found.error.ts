// user-not-found.error.ts
import { NotFoundException } from '@nestjs/common';

export class UserNotFoundError extends NotFoundException {
  constructor() {
    super('User not found');
  }
}