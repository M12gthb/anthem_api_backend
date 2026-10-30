// test/auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app.js';

const COOKIE_NAME = 'refresh_token';
const NEW_PASSWORD = 'NovaSenha456';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  // Set-Cookie completo do refresh token (com os atributos), se existir
  function refreshSetCookie(res: { headers: Record<string, unknown> }) {
    const raw = res.headers['set-cookie'] as string[] | string | undefined;
    return ([] as string[])
      .concat(raw ?? [])
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  }

  // "refresh_token=valor": o que o navegador reenvia no cabeçalho Cookie
  function toCookieHeader(setCookie: string | undefined) {
    expect(setCookie).toBeDefined();
    return (setCookie as string).split(';')[0];
  }

  const login = (email: string, password: string) =>
    http().post('/auth/login').send({ email, password });

  const refresh = (cookie?: string) => {
    const req = http().post('/auth/refresh');
    return cookie ? req.set('Cookie', cookie) : req;
  };

  const signToken = (secret: string, payload: Record<string, unknown>) =>
    new JwtService({ secret }).signAsync(payload);

  const changePassword = (
    userId: string,
    token: string,
    currentPassword: string,
  ) =>
    http()
      .patch(`/users/${userId}`)
      .set(bearer(token))
      .send({
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
        currentPassword,
      });

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
    it('200 - retorna o accessToken e não expõe o refresh token no corpo', async () => {
      const { credentials } = await registerAndLogin(app);

      const res = await login(credentials.email, credentials.password).expect(
        200,
      );

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toBeUndefined();
    });

    it('200 - envia o refresh token em cookie HttpOnly restrito a /auth', async () => {
      const { credentials } = await registerAndLogin(app);

      const res = await login(credentials.email, credentials.password).expect(
        200,
      );

      const cookie = refreshSetCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/auth/i);
      expect(cookie).toMatch(/SameSite=Lax/i); // valor padrão do ambiente de teste
    });

    it('200 - cada login gera um refresh token diferente', async () => {
      const { credentials, refreshCookie } = await registerAndLogin(app);

      const res = await login(credentials.email, credentials.password).expect(
        200,
      );

      expect(toCookieHeader(refreshSetCookie(res))).not.toBe(refreshCookie);
    });

    it('401 - senha incorreta (e não define cookie)', async () => {
      const { credentials } = await registerAndLogin(app);

      const res = await login(credentials.email, 'senhaErrada123').expect(401);

      expect(refreshSetCookie(res)).toBeUndefined();
    });

    it('401 - e-mail inexistente (mesma resposta da senha errada)', async () => {
      const { credentials } = await registerAndLogin(app);
      const senhaErrada = await login(credentials.email, 'senhaErrada123');

      const res = await login('ninguem@email.com', 'Senha12345').expect(401);

      expect(res.body).toEqual(senhaErrada.body);
      expect(refreshSetCookie(res)).toBeUndefined();
    });

    it('401 - conta removida não consegue logar', async () => {
      const { user, token, credentials } = await registerAndLogin(app);
      await http()
        .delete(`/users/${user.id}`)
        .set(bearer(token))
        .expect(204);

      await login(credentials.email, credentials.password).expect(401);
    });

    it.each([
      ['e-mail mal formatado', { email: 'nao-e-email', password: 'Senha12345' }],
      ['sem senha', { email: 'a@email.com' }],
      ['senha vazia', { email: 'a@email.com', password: '' }],
    ])('400 - corpo inválido (%s)', async (_caso, invalido) => {
      await http().post('/auth/login').send(invalido).expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('200 - devolve um accessToken válido e rotaciona o refresh token', async () => {
      const { user, refreshCookie } = await registerAndLogin(app);

      const res = await refresh(refreshCookie).expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toBeUndefined();
      // o token novo funciona numa rota protegida
      await http()
        .get(`/users/${user.id}`)
        .set(bearer(res.body.accessToken))
        .expect(200);
      // o cookie foi trocado por outro
      const novo = toCookieHeader(refreshSetCookie(res));
      expect(novo).not.toBe(refreshCookie);
      expect(refreshSetCookie(res)).toMatch(/HttpOnly/i);
    });

    it('200 - o refresh token novo também pode ser usado', async () => {
      const { refreshCookie } = await registerAndLogin(app);
      const primeiro = await refresh(refreshCookie).expect(200);

      await refresh(toCookieHeader(refreshSetCookie(primeiro))).expect(200);
    });

    it('401 - sem cookie', async () => {
      await refresh().expect(401);
    });

    it('401 - cookie com valor inválido', async () => {
      await refresh(`${COOKIE_NAME}=valor-que-nao-existe`).expect(401);
    });

    it('401 - refresh token expirado', async () => {
      const { refreshCookie } = await registerAndLogin(app);
      await app
        .get(DataSource)
        .query(
          `UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'`,
        );

      await refresh(refreshCookie).expect(401);
    });

    it('401 - reutilizar um refresh token já trocado revoga toda a sessão', async () => {
      const { refreshCookie } = await registerAndLogin(app);
      const primeiro = await refresh(refreshCookie).expect(200);
      const novo = toCookieHeader(refreshSetCookie(primeiro));

      // apresentar o token antigo de novo é sinal de roubo
      await refresh(refreshCookie).expect(401);
      // e o token novo, que era válido, também deixa de funcionar
      await refresh(novo).expect(401);
    });

    it('401 - conta removida não consegue renovar', async () => {
      const { user, token, refreshCookie } = await registerAndLogin(app);
      await http()
        .delete(`/users/${user.id}`)
        .set(bearer(token))
        .expect(204);

      await refresh(refreshCookie).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('204 - revoga o refresh token e apaga o cookie', async () => {
      const { refreshCookie } = await registerAndLogin(app);

      const res = await http()
        .post('/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(204);

      const cookie = refreshSetCookie(res);
      expect(cookie).toMatch(new RegExp(`^${COOKIE_NAME}=;`));
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
      expect(cookie).toMatch(/Path=\/auth/i);
    });

    it('401 - depois do logout o refresh token não renova mais', async () => {
      const { refreshCookie } = await registerAndLogin(app);
      await http()
        .post('/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(204);

      await refresh(refreshCookie).expect(401);
    });

    it('204 - sem cookie (logout repetido não dá erro)', async () => {
      await http().post('/auth/logout').expect(204);
    });

    it('200 - o logout de um dispositivo não afeta os outros', async () => {
      const { credentials, refreshCookie: dispositivoA } =
        await registerAndLogin(app);
      const loginB = await login(
        credentials.email,
        credentials.password,
      ).expect(200);
      const dispositivoB = toCookieHeader(refreshSetCookie(loginB));

      await http()
        .post('/auth/logout')
        .set('Cookie', dispositivoA)
        .expect(204);

      await refresh(dispositivoB).expect(200);
    });
  });

  describe('Proteção das rotas (JwtAuthGuard)', () => {
    it('200 - token válido', async () => {
      const { token } = await registerAndLogin(app);

      await http().get('/users').set(bearer(token)).expect(200);
    });

    it('401 - sem cabeçalho Authorization', async () => {
      await http().get('/users').expect(401);
    });

    it('401 - cabeçalho sem o prefixo Bearer', async () => {
      const { token } = await registerAndLogin(app);

      await http().get('/users').set({ Authorization: token }).expect(401);
    });

    it('401 - esquema diferente de Bearer (Basic)', async () => {
      await http()
        .get('/users')
        .set({ Authorization: 'Basic dXNlcjpzZW5oYQ==' })
        .expect(401);
    });

    it('401 - token malformado', async () => {
      await http().get('/users').set(bearer('isto-nao-e-um-jwt')).expect(401);
    });

    it('401 - token assinado com outra chave', async () => {
      const { user } = await registerAndLogin(app);
      const falso = await signToken('outra-chave-qualquer', {
        sub: user.id,
        tv: 0,
      });

      await http().get('/users').set(bearer(falso)).expect(401);
    });

    it('401 - token expirado', async () => {
      const { user } = await registerAndLogin(app);
      const expirado = await signToken(process.env.JWT_SECRET as string, {
        sub: user.id,
        tv: 0,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      await http().get('/users').set(bearer(expirado)).expect(401);
    });

    it('401 - token sem a versão (tv), mesmo com assinatura correta', async () => {
      const { user } = await registerAndLogin(app);
      const semVersao = await signToken(process.env.JWT_SECRET as string, {
        sub: user.id,
      });

      await http().get('/users').set(bearer(semVersao)).expect(401);
    });

    it('401 - conta removida: o token deixa de valer na hora', async () => {
      const { user, token } = await registerAndLogin(app);
      await http()
        .delete(`/users/${user.id}`)
        .set(bearer(token))
        .expect(204);

      await http().get('/users').set(bearer(token)).expect(401);
    });
  });

  describe('Invalidação de tokens ao trocar a senha', () => {
    it('401 - o accessToken antigo deixa de valer na mesma hora', async () => {
      const { user, token, credentials } = await registerAndLogin(app);

      await changePassword(user.id, token, credentials.password).expect(200);

      await http().get(`/users/${user.id}`).set(bearer(token)).expect(401);
    });

    it('401 - o refresh token antigo deixa de valer', async () => {
      const { user, token, credentials, refreshCookie } =
        await registerAndLogin(app);

      await changePassword(user.id, token, credentials.password).expect(200);

      await refresh(refreshCookie).expect(401);
    });

    it('401 - vale para todos os dispositivos, não só o que trocou a senha', async () => {
      const { user, token, credentials, refreshCookie } =
        await registerAndLogin(app);
      const loginB = await login(
        credentials.email,
        credentials.password,
      ).expect(200);
      const tokenB = loginB.body.accessToken as string;
      const cookieB = toCookieHeader(refreshSetCookie(loginB));

      await changePassword(user.id, token, credentials.password).expect(200);

      await http().get(`/users/${user.id}`).set(bearer(tokenB)).expect(401);
      await refresh(cookieB).expect(401);
      await refresh(refreshCookie).expect(401);
    });

    it('200 - um login novo com a senha nova funciona', async () => {
      const { user, token, credentials } = await registerAndLogin(app);
      await changePassword(user.id, token, credentials.password).expect(200);

      const res = await login(credentials.email, NEW_PASSWORD).expect(200);

      await http()
        .get(`/users/${user.id}`)
        .set(bearer(res.body.accessToken))
        .expect(200);
      expect(refreshSetCookie(res)).toBeDefined();
    });

    it('200 - alterar outros campos não invalida os tokens', async () => {
      const { user, token, refreshCookie } = await registerAndLogin(app);

      await http()
        .patch(`/users/${user.id}`)
        .set(bearer(token))
        .send({ username: 'Novo Nome' })
        .expect(200);

      await http().get(`/users/${user.id}`).set(bearer(token)).expect(200);
      await refresh(refreshCookie).expect(200);
    });

    it('200 - trocar o e-mail não invalida os tokens', async () => {
      const { user, token } = await registerAndLogin(app);

      await http()
        .patch(`/users/${user.id}`)
        .set(bearer(token))
        .send({ email: 'novo-email@email.com' })
        .expect(200);

      await http().get(`/users/${user.id}`).set(bearer(token)).expect(200);
    });

    it('400 - troca de senha recusada (senha atual errada) não invalida os tokens', async () => {
      const { user, token, refreshCookie } = await registerAndLogin(app);

      await changePassword(user.id, token, 'senhaAtualErrada1').expect(400);

      await http().get(`/users/${user.id}`).set(bearer(token)).expect(200);
      await refresh(refreshCookie).expect(200);
    });
  });
});