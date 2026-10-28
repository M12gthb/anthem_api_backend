import { ConflictException } from '@nestjs/common';

export class SkillAlreadyExistsError extends ConflictException {
  constructor(name: string) {
    super(`The skill "${name}" already exists`);
  }
}