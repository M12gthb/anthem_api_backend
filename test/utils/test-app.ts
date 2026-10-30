import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

// apaga os dados de todas as tabelas entre os testes
export async function resetDatabase(app: INestApplication) {
  const dataSource = app.get(DataSource);
  const tables = dataSource.entityMetadatas
    .map((m) => `"${m.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

// cadastra um usuário, faz login e devolve o token e o cookie do refresh token
export async function registerAndLogin(
  app: INestApplication,
  overrides: Partial<{
    username: string;
    email: string;
    password: string;
    favoritePhrase: string;
  }> = {},
) {
  const password = overrides.password ?? 'Senha12345';
  const credentials = {
    username: 'Teste',
    email: `teste-${randomUUID()}@email.com`,
    password,
    confirmPassword: password,
    ...overrides,
  };

  const created = await request(app.getHttpServer())
    .post('/users')
    .send(credentials)
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: credentials.email, password: credentials.password })
    .expect(200);

  // "refresh_token=valor": pronto para reenviar no cabeçalho Cookie
  const setCookies = ([] as string[]).concat(
    (login.headers['set-cookie'] as string[] | string | undefined) ?? [],
  );
  const refreshCookie =
    setCookies.find((c) => c.startsWith('refresh_token='))?.split(';')[0] ?? '';

  return {
    user: created.body as { id: string; email: string },
    token: login.body.accessToken as string,
    refreshCookie,
    credentials,
  };
}