import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  NON_EXISTENT_ID,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app.js';

describe('Users (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    const body = {
      username: 'Matheus',
      email: 'matheus@email.com',
      password: 'Senha12345',
      confirmPassword: 'Senha12345',
    };

    it('201 - cria o usuário e não retorna a senha nem a confirmação', async () => {
      const res = await http().post('/users').send(body).expect(201);

      expect(res.body).toMatchObject({
        username: 'Matheus',
        email: 'matheus@email.com',
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('confirmPassword');
    });

    it('201 - cria o usuário com a frase favorita', async () => {
      const res = await http()
        .post('/users')
        .send({ ...body, favoritePhrase: 'Carpe diem' })
        .expect(201);

      expect(res.body.favoritePhrase).toBe('Carpe diem');
    });

    it('201 - sem frase favorita, o campo vem nulo', async () => {
      const res = await http().post('/users').send(body).expect(201);

      expect(res.body.favoritePhrase).toBeNull();
    });

    it('409 - e-mail já existe', async () => {
      await http().post('/users').send(body).expect(201);

      const res = await http().post('/users').send(body).expect(409);
      expect(res.body.message).toEqual(expect.any(String));
    });

    it.each([
      ['e-mail inválido', { ...body, email: 'nao-e-email' }],
      [
        'senha com menos de 8 caracteres',
        { ...body, password: '1234567', confirmPassword: '1234567' },
      ],
      [
        'sem username',
        {
          email: body.email,
          password: body.password,
          confirmPassword: body.confirmPassword,
        },
      ],
      ['campo que não existe no DTO', { ...body, role: 'admin' }],
      [
        'sem confirmPassword',
        {
          username: body.username,
          email: body.email,
          password: body.password,
        },
      ],
      [
        'confirmPassword diferente da senha',
        { ...body, confirmPassword: 'OutraSenha999' },
      ],
      [
        'confirmPassword diferente só nas maiúsculas',
        { ...body, confirmPassword: 'senha12345' },
      ],
      [
        'favoritePhrase com mais de 255 caracteres',
        { ...body, favoritePhrase: 'a'.repeat(256) },
      ],
      ['favoritePhrase que não é texto', { ...body, favoritePhrase: 123 }],
    ])('400 - corpo inválido (%s)', async (_caso, invalido) => {
      await http().post('/users').send(invalido).expect(400);
    });

    it('400 - a mensagem de erro aponta o campo confirmPassword', async () => {
      const res = await http()
        .post('/users')
        .send({ ...body, confirmPassword: 'OutraSenha999' })
        .expect(400);

      expect([res.body.message].flat().join(' ')).toContain('confirmPassword');
    });

    it('400 - não cria o usuário quando a confirmação não bate', async () => {
      await http()
        .post('/users')
        .send({ ...body, confirmPassword: 'OutraSenha999' })
        .expect(400);

      // o cadastro falhou, então o mesmo e-mail ainda pode ser usado
      await http().post('/users').send(body).expect(201);
    });
  });

  describe('GET /users', () => {
    it('401 - sem token', async () => {
      await http().get('/users').expect(401);
    });

    it('401 - token inválido', async () => {
      await http().get('/users').set(auth('token.invalido.aqui')).expect(401);
    });

    it('200 - lista paginada sem expor a senha', async () => {
      const { token } = await registerAndLogin(app, { email: 'a@email.com' });
      await registerAndLogin(app, { email: 'b@email.com' });
      await registerAndLogin(app, { email: 'c@email.com' });

      const page1 = await http()
        .get('/users?page=1&limit=2')
        .set(auth(token))
        .expect(200);

      expect(page1.body).toMatchObject({ total: 3, page: 1, limit: 2 });
      expect(page1.body.data).toHaveLength(2);
      page1.body.data.forEach((u: object) => {
        expect(u).not.toHaveProperty('password');
        expect(u).not.toHaveProperty('confirmPassword');
      });

      const page2 = await http()
        .get('/users?page=2&limit=2')
        .set(auth(token))
        .expect(200);
      expect(page2.body.data).toHaveLength(1);
    });
  });

  describe('GET /users/:id', () => {
    it('401 - sem token', async () => {
      await http().get(`/users/${NON_EXISTENT_ID}`).expect(401);
    });

    it('200 - retorna o usuário com a frase favorita e sem a senha', async () => {
      const { user, token } = await registerAndLogin(app, {
        favoritePhrase: 'Carpe diem',
      });

      const res = await http()
        .get(`/users/${user.id}`)
        .set(auth(token))
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body.favoritePhrase).toBe('Carpe diem');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('confirmPassword');
    });

    it('404 - usuário não encontrado', async () => {
      const { token } = await registerAndLogin(app);

      await http()
        .get(`/users/${NON_EXISTENT_ID}`)
        .set(auth(token))
        .expect(404);
    });

    it('400 - id que não é UUID', async () => {
      const { token } = await registerAndLogin(app);

      await http().get('/users/abc').set(auth(token)).expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('401 - sem token', async () => {
      await http()
        .patch(`/users/${NON_EXISTENT_ID}`)
        .send({ username: 'x' })
        .expect(401);
    });

    it('200 - atualiza os dados de perfil', async () => {
      const { user, token } = await registerAndLogin(app);

      const res = await http()
        .patch(`/users/${user.id}`)
        .set(auth(token))
        .send({
          username: 'Novo Nome',
          currentPosition: 'Dev Pleno',
          seniority: 'mid',
          favoritePhrase: 'Feito é melhor que perfeito',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        username: 'Novo Nome',
        currentPosition: 'Dev Pleno',
        seniority: 'mid',
        favoritePhrase: 'Feito é melhor que perfeito',
      });
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('confirmPassword');
    });

    describe('senha', () => {
      it('200 - troca a senha informando a senha atual e a confirmação', async () => {
        const { user, token, credentials } = await registerAndLogin(app);

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({
            password: 'NovaSenha456',
            confirmPassword: 'NovaSenha456',
            currentPassword: credentials.password,
          })
          .expect(200);

        expect(res.body).not.toHaveProperty('password');
        expect(res.body).not.toHaveProperty('confirmPassword');

        await http()
          .post('/auth/login')
          .send({ email: credentials.email, password: 'NovaSenha456' })
          .expect(200);
        await http()
          .post('/auth/login')
          .send({ email: credentials.email, password: credentials.password })
          .expect(401);
      });

      it('400 - senha nova sem a senha atual', async () => {
        const { user, token } = await registerAndLogin(app);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ password: 'NovaSenha456', confirmPassword: 'NovaSenha456' })
          .expect(400);
      });

      it('400 - senha atual incorreta', async () => {
        const { user, token } = await registerAndLogin(app);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({
            password: 'NovaSenha456',
            confirmPassword: 'NovaSenha456',
            currentPassword: 'errada12345',
          })
          .expect(400);
      });

      it('400 - senha nova sem confirmPassword', async () => {
        const { user, token, credentials } = await registerAndLogin(app);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({
            password: 'NovaSenha456',
            currentPassword: credentials.password,
          })
          .expect(400);
      });

      it('400 - confirmPassword diferente da senha nova (a senha não muda)', async () => {
        const { user, token, credentials } = await registerAndLogin(app);

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({
            password: 'NovaSenha456',
            confirmPassword: 'OutraSenha999',
            currentPassword: credentials.password,
          })
          .expect(400);
        expect([res.body.message].flat().join(' ')).toContain('confirmPassword');

        // a senha antiga continua valendo e a nova não funciona
        await http()
          .post('/auth/login')
          .send({ email: credentials.email, password: credentials.password })
          .expect(200);
        await http()
          .post('/auth/login')
          .send({ email: credentials.email, password: 'NovaSenha456' })
          .expect(401);
      });

      it('400 - confirmPassword sem enviar a senha nova', async () => {
        const { user, token } = await registerAndLogin(app);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ confirmPassword: 'NovaSenha456' })
          .expect(400);
      });
    });

    describe('e-mail', () => {
      it('200 - troca o e-mail e o login passa a usar o novo', async () => {
        const { user, token, credentials } = await registerAndLogin(app, {
          email: 'antigo@email.com',
        });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ email: 'novo@email.com' })
          .expect(200);

        expect(res.body.email).toBe('novo@email.com');

        await http()
          .post('/auth/login')
          .send({ email: 'novo@email.com', password: credentials.password })
          .expect(200);
        await http()
          .post('/auth/login')
          .send({ email: 'antigo@email.com', password: credentials.password })
          .expect(401);
      });

      it('200 - enviar o próprio e-mail junto com outro campo não dá conflito', async () => {
        const { user, token } = await registerAndLogin(app, {
          email: 'a@email.com',
        });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ email: 'a@email.com', username: 'Mesmo E-mail' })
          .expect(200);

        expect(res.body).toMatchObject({
          email: 'a@email.com',
          username: 'Mesmo E-mail',
        });
      });

      it('409 - e-mail já usado por outra conta', async () => {
        const { user, token } = await registerAndLogin(app, {
          email: 'a@email.com',
        });
        await registerAndLogin(app, { email: 'b@email.com' });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ email: 'b@email.com' })
          .expect(409);
        expect(res.body.message).toEqual(expect.any(String));

        // o e-mail original continua o mesmo
        const atual = await http()
          .get(`/users/${user.id}`)
          .set(auth(token))
          .expect(200);
        expect(atual.body.email).toBe('a@email.com');
      });

      it('409 - e-mail de uma conta que foi deletada', async () => {
        const { user, token } = await registerAndLogin(app, {
          email: 'a@email.com',
        });
        const { user: apagado, token: tokenApagado } = await registerAndLogin(
          app,
          { email: 'b@email.com' },
        );
        await http()
          .delete(`/users/${apagado.id}`)
          .set(auth(tokenApagado))
          .expect(204);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ email: 'b@email.com' })
          .expect(409);
      });
    });

    describe('frase favorita', () => {
      it('200 - atualiza a frase favorita', async () => {
        const { user, token } = await registerAndLogin(app, {
          favoritePhrase: 'Frase antiga',
        });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ favoritePhrase: 'Frase nova' })
          .expect(200);
        expect(res.body.favoritePhrase).toBe('Frase nova');

        const atual = await http()
          .get(`/users/${user.id}`)
          .set(auth(token))
          .expect(200);
        expect(atual.body.favoritePhrase).toBe('Frase nova');
      });

      it('200 - limpa a frase favorita enviando null', async () => {
        const { user, token } = await registerAndLogin(app, {
          favoritePhrase: 'Carpe diem',
        });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ favoritePhrase: null })
          .expect(200);

        expect(res.body.favoritePhrase).toBeNull();
      });

      it('200 - não mexe na frase quando o campo não é enviado', async () => {
        const { user, token } = await registerAndLogin(app, {
          favoritePhrase: 'Carpe diem',
        });

        const res = await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send({ username: 'Outro Nome' })
          .expect(200);

        expect(res.body.favoritePhrase).toBe('Carpe diem');
      });

      it.each([
        ['mais de 255 caracteres', { favoritePhrase: 'a'.repeat(256) }],
        ['que não é texto', { favoritePhrase: 123 }],
      ])('400 - frase favorita %s', async (_caso, invalido) => {
        const { user, token } = await registerAndLogin(app);

        await http()
          .patch(`/users/${user.id}`)
          .set(auth(token))
          .send(invalido)
          .expect(400);
      });
    });

    it.each([
      ['e-mail inválido', { email: 'nao-e-email' }],
      ['data de nascimento (não pode ser alterada)', { birthDate: '1998-05-23' }],
      ['seniority fora do enum', { seniority: 'deus' }],
      ['campo que não existe', { admin: true }],
    ])('400 - campo inválido (%s)', async (_caso, invalido) => {
      const { user, token } = await registerAndLogin(app);

      await http()
        .patch(`/users/${user.id}`)
        .set(auth(token))
        .send(invalido)
        .expect(400);
    });

    it('403 - tentando alterar a conta de outra pessoa', async () => {
      const { token } = await registerAndLogin(app, { email: 'a@email.com' });
      const { user: outro } = await registerAndLogin(app, { email: 'b@email.com' });

      await http()
        .patch(`/users/${outro.id}`)
        .set(auth(token))
        .send({ username: 'invasor' })
        .expect(403);
    });

    it('404 - conta já deletada, com token ainda válido', async () => {
      const { user, token } = await registerAndLogin(app);
      await http().delete(`/users/${user.id}`).set(auth(token)).expect(204);

      await http()
        .patch(`/users/${user.id}`)
        .set(auth(token))
        .send({ username: 'fantasma' })
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('401 - sem token', async () => {
      await http().delete(`/users/${NON_EXISTENT_ID}`).expect(401);
    });

    it('403 - tentando deletar a conta de outra pessoa', async () => {
      const { token } = await registerAndLogin(app, { email: 'a@email.com' });
      const { user: outro } = await registerAndLogin(app, { email: 'b@email.com' });

      await http().delete(`/users/${outro.id}`).set(auth(token)).expect(403);
    });

    it('204 - deleta a própria conta', async () => {
      const { user, token, credentials } = await registerAndLogin(app, {
        email: 'a@email.com',
      });
      const { token: outroToken } = await registerAndLogin(app, {
        email: 'b@email.com',
      });

      await http().delete(`/users/${user.id}`).set(auth(token)).expect(204);

      // some das consultas e não consegue mais logar
      await http().get(`/users/${user.id}`).set(auth(outroToken)).expect(404);
      await http()
        .post('/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(401);
    });

    it('404 - deletar uma conta que já foi deletada', async () => {
      const { user, token } = await registerAndLogin(app);
      await http().delete(`/users/${user.id}`).set(auth(token)).expect(204);

      await http().delete(`/users/${user.id}`).set(auth(token)).expect(404);
    });
  });
});