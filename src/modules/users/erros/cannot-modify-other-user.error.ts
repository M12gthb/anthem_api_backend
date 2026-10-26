// cannot-modify-other-user.error.ts
import { ForbiddenException } from '@nestjs/common';

export class CannotModifyOtherUserError extends ForbiddenException {
  constructor() {
    super('Você só pode alterar a sua própria conta');
  }
}