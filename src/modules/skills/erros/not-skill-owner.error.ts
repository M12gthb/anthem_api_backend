import { ForbiddenException } from '@nestjs/common';

export class NotSkillOwnerError extends ForbiddenException {
  constructor() {
    super('Você só pode remover habilidades que você criou');
  }
}