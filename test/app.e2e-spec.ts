import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

describe('App (health, CORS e proxy)', () => {
  let app: INestApplication;
  const FRONT = 'https://front.exemplo.com';

  beforeAll(async () => {
    process.env.FRONTEND_URL = `${FRONT}/`; // barra final é ignorada
    app = await createTestApp();
  });

  afterAll(async () => {
    delete process.env.FRONTEND_URL;
    await app.close();
  });

  it('GET /health responde 200 sem autenticação', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('libera CORS com credenciais para a origem do front', async () => {
    const res = await request(app.getHttpServer())
      .options('/auth/refresh')
      .set('Origin', FRONT)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(FRONT);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('não libera CORS para outras origens', async () => {
    const res = await request(app.getHttpServer())
      .options('/auth/refresh')
      .set('Origin', 'https://site-malicioso.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
