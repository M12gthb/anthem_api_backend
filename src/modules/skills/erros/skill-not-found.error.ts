import { NotFoundException } from '@nestjs/common';

export class SkillNotFoundError extends NotFoundException {
  constructor() {
    super('Skill not found');
  }
}