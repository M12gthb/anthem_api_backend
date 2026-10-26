// invalid-birth-date.error.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidBirthDateError extends BadRequestException {
  constructor() {
    super('A data de nascimento não pode ser no futuro');
  }
}