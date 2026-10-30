import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

if (!process.env.DATABASE_URL?.endsWith('_test')) {
  throw new Error('DATABASE_URL de teste deve terminar com "_test"');
}