// usado só pela CLI do TypeORM (npm run migration:*), não pela API
import { DataSource } from 'typeorm';
import { baseDataSourceOptions } from './typeorm.options.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'Defina DATABASE_URL (no .env ou no terminal) para rodar as migrations',
  );
}

export default new DataSource({
  ...baseDataSourceOptions(url),
  entities: [`${import.meta.dirname}/../**/*.entity.js`],
});
