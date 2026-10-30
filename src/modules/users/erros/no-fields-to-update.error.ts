import { BadRequestException } from '@nestjs/common';

export class NoFieldsToUpdateError extends BadRequestException {
  constructor() {
    super('No fields to update');
  }
}