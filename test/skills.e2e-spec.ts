// test/skills.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity.js';
import {
  createTestApp,
  NON_EXISTENT_ID,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app.js';

describe('Skills (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function createSkill(token: string, name: string) {
    const res = await http()
      .post('/skills')
      .set(auth(token))
      .send({ name })
      .expect(201);
    return res.body as { id: string; name: string };
  }

  async function giveSkillToUser(userId: string, skillId: string) {
    await app
      .get(DataSource)
      .createQueryBuilder()
      .relation(User, 'skills')
      .of(userId)
      .add(skillId);
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('GET /skills', () => {
    it('200 - lista vazia quando não há habilidades', async () => {
      const res = await http().get('/skills').expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('200 - lista paginada', async () => {
      const { token } = await registerAndLogin(app);
      for (const name of ['NestJS', 'TypeScript', 'Docker']) {
        await createSkill(token, name);
      }

      const res = await http().get('/skills?page=1&limit=2').expect(200);

      expect(res.body).toMatchObject({ total: 3, page: 1, limit: 2 });
      expect(res.body.data).toHaveLength(2);

      const page2 = await http().get('/skills?page=2&limit=2').expect(200);
      expect(page2.body.data).toHaveLength(1);
    });
  });

  describe('GET /skills/:id', () => {
    it('200 - retorna a habilidade', async () => {
      const { token } = await registerAndLogin(app);
      const skill = await createSkill(token, 'NestJS');

      const res = await http().get(`/skills/${skill.id}`).expect(200);

      expect(res.body).toMatchObject({ id: skill.id, name: 'NestJS' });
    });

    it('404 - habilidade não encontrada', async () => {
      await http().get(`/skills/${NON_EXISTENT_ID}`).expect(404);
    });

    it('400 - id que não é UUID', async () => {
      await http().get('/skills/abc').expect(400);
    });
  });

  describe('GET /skills/user/:userId', () => {
    it('200 - retorna as habilidades do usuário', async () => {
      const { user, token } = await registerAndLogin(app);
      const nest = await createSkill(token, 'NestJS');
      const docker = await createSkill(token, 'Docker');
      await createSkill(token, 'Python'); // não pertence ao usuário
      await giveSkillToUser(user.id, nest.id);
      await giveSkillToUser(user.id, docker.id);

      const res = await http().get(`/skills/user/${user.id}`).expect(200);

      expect(res.body.map((s: { name: string }) => s.name).sort()).toEqual([
        'Docker',
        'NestJS',
      ]);
    });

    it('200 - lista vazia para usuário sem habilidades', async () => {
      const { user } = await registerAndLogin(app);

      const res = await http().get(`/skills/user/${user.id}`).expect(200);

      expect(res.body).toEqual([]);
    });

    it('404 - usuário não encontrado', async () => {
      await http().get(`/skills/user/${NON_EXISTENT_ID}`).expect(404);
    });
  });

  describe('POST /skills', () => {
    it('401 - sem token', async () => {
      await http().post('/skills').send({ name: 'NestJS' }).expect(401);
    });

    it('201 - cria a habilidade e retorna ela', async () => {
      const { token } = await registerAndLogin(app);

      const res = await http()
        .post('/skills')
        .set(auth(token))
        .send({ name: 'NestJS' })
        .expect(201);

      expect(res.body).toMatchObject({ name: 'NestJS' });
      expect(res.body.id).toEqual(expect.any(String));
    });

    it('409 - habilidade duplicada, ignorando maiúsculas', async () => {
      const { token } = await registerAndLogin(app);
      await createSkill(token, 'NestJS');

      await http()
        .post('/skills')
        .set(auth(token))
        .send({ name: 'nestjs' })
        .expect(409);
    });

    it.each([
      ['nome vazio', { name: '' }],
      ['sem nome', {}],
      ['nome com mais de 100 caracteres', { name: 'a'.repeat(101) }],
      ['campo que não existe', { name: 'NestJS', nivel: 'alto' }],
    ])('400 - corpo inválido (%s)', async (_caso, invalido) => {
      const { token } = await registerAndLogin(app);

      await http().post('/skills').set(auth(token)).send(invalido).expect(400);
    });
  });

  describe('DELETE /skills/:id', () => {
    it('401 - sem token', async () => {
      await http().delete(`/skills/${NON_EXISTENT_ID}`).expect(401);
    });

    it('404 - habilidade não encontrada', async () => {
      const { token } = await registerAndLogin(app);

      await http()
        .delete(`/skills/${NON_EXISTENT_ID}`)
        .set(auth(token))
        .expect(404);
    });

    it('204 - deleta a habilidade', async () => {
      const { token } = await registerAndLogin(app);
      const skill = await createSkill(token, 'NestJS');

      await http().delete(`/skills/${skill.id}`).set(auth(token)).expect(204);

      await http().get(`/skills/${skill.id}`).expect(404);
    });

    // Habilita quando a skill tiver um dono (coluna created_by) ou quando
    // a exclusão for restrita a admin.
    it.todo('403 - só o dono da habilidade pode deletar');
  });
});