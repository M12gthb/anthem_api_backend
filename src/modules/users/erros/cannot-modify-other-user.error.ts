import { ForbiddenException } from '@nestjs/common';

export class CannotModifyOtherUserError extends ForbiddenException {
  constructor() {
    super('You can only modify your own account');
  }
}