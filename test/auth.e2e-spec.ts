import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, registerAndLogin, resetDatabase } from './utils/test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('200 - retorna o token com credenciais corretas', async () => {
      const { credentials } = await registerAndLogin(app);

      const res = await http()
        .post('/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('401 - senha incorreta', async () => {
      const { credentials } = await registerAndLogin(app);

      await http()
        .post('/auth/login')
        .send({ email: credentials.email, password: 'senhaErrada123' })
        .expect(401);
    });

    it('401 - e-mail inexistente (mesma resposta da senha errada)', async () => {
      await http()
        .post('/auth/login')
        .send({ email: 'ninguem@email.com', password: 'Senha12345' })
        .expect(401);
    });

    it('400 - corpo inválido', async () => {
      await http().post('/auth/login').send({ email: 'nao-e-email' }).expect(400);
    });
  });
});