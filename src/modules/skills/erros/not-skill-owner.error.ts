import { ForbiddenException } from '@nestjs/common';

export class NotSkillOwnerError extends ForbiddenException {
  constructor() {
    super('You can only remove skills that you created');
  }
}