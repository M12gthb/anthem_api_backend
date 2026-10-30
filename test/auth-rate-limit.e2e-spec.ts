import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './utils/test-app.js';


describe('Auth - limite de tentativas de login (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  const PASSWORD = 'Senha12345';
  const LIMIT = 5;

  // cadastra sem fazer login (o login também conta no limite)
  async function register(email: string) {
    await http()
      .post('/users')
      .send({
        username: 'Teste',
        email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      })
      .expect(201);
  }

  const attempt = (email: string, password: string) =>
    http().post('/auth/login').send({ email, password });

  async function failTimes(email: string, times: number) {
    for (let i = 0; i < times; i++) {
      await attempt(email, 'senhaErrada123').expect(401);
    }
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeEach(async () => {
    // lidos a cada requisição, então podem mudar dentro de cada teste
    vi.stubEnv('LOGIN_RATE_LIMIT', String(LIMIT));
    vi.stubEnv('LOGIN_RATE_TTL_MS', '60000');
    app = await createTestApp();
    await resetDatabase(app);
  });
  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('401 nas 5 primeiras tentativas erradas e 429 na 6ª, com Retry-After', async () => {
    await register('a@email.com');
    await failTimes('a@email.com', LIMIT);

    const res = await attempt('a@email.com', 'senhaErrada123').expect(429);

    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('429 - depois de estourar o limite, nem a senha correta passa', async () => {
    await register('a@email.com');
    await failTimes('a@email.com', LIMIT);

    await attempt('a@email.com', PASSWORD).expect(429);
  });

  it('200 - o limite é por e-mail: outro e-mail não é afetado', async () => {
    await register('a@email.com');
    await register('b@email.com');
    await failTimes('a@email.com', LIMIT);
    await attempt('a@email.com', 'senhaErrada123').expect(429);

    await attempt('b@email.com', PASSWORD).expect(200);
  });

  it('200 - as outras rotas não são afetadas pelo bloqueio do login', async () => {
    await register('a@email.com');
    await failTimes('a@email.com', LIMIT);
    await attempt('a@email.com', 'senhaErrada123').expect(429);

    await http().get('/skills').expect(200);
  });

  it('200 - passada a janela de tempo, o login volta a funcionar', async () => {
    vi.stubEnv('LOGIN_RATE_TTL_MS', '1000');
    await register('a@email.com');
    await failTimes('a@email.com', LIMIT);
    await attempt('a@email.com', PASSWORD).expect(429);

    await sleep(1200);

    await attempt('a@email.com', PASSWORD).expect(200);
  });
});