// test/setup-env.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.test') });

// trava de segurança: os testes apagam dados, então só rodam em banco "_test"
if (!process.env.DATABASE_URL?.endsWith('_test')) {
  throw new Error('DATABASE_URL de teste deve terminar com "_test"');
}