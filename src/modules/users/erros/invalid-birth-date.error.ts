// invalid-birth-date.error.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidBirthDateError extends BadRequestException {
  constructor() {
    super('The birthdate cannot be in the future');
  }
}