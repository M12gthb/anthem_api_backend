// no-fields-to-update.error.ts
import { BadRequestException } from '@nestjs/common';

export class NoFieldsToUpdateError extends BadRequestException {
  constructor() {
    super('Nenhum campo para atualizar');
  }
}