import { ConflictException } from '@nestjs/common';

export class SkillAlreadyExistsError extends ConflictException {
  constructor(name: string) {
    super(`A habilidade "${name}" já existe`);
  }
}