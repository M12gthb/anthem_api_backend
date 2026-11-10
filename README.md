# Anthem API

API de um gerenciador de carreira: cadastro de usuários, autenticação com JWT e habilidades (skills).

**Stack:** NestJS · TypeORM · PostgreSQL · Docker · Vitest

## Rodando localmente

**Requisitos:** [Node.js](https://nodejs.org/) 22+ e [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/M12gthb/anthem_api_backend.git
cd anthem_api_backend
cp .env.example .env          # ajuste a senha do banco e o JWT_SECRET
npm install
docker compose up -d db       # PostgreSQL na porta 5433
npm run start:dev             # API em http://localhost:3000
```

- Documentação interativa (Swagger): http://localhost:3000/docs
- Em desenvolvimento as tabelas são criadas automaticamente a partir das entidades.
- Para gerar um `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**Tudo pelo Docker** (API + banco, API na porta 3001):

```bash
docker compose up -d --build
```

### Testes

Os testes e2e usam um banco separado, cujo nome precisa terminar em `_test`:

```bash
docker compose exec db createdb -U postgres anthem_test
```

Crie um `.env.test`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5433/anthem_test
JWT_SECRET=qualquer_valor_para_testes
```

```bash
npm run test:e2e
```

### Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run start:dev` | API com recarregamento automático |
| `npm run build` / `npm run start:prod` | Compila e roda a versão de produção |
| `npm run test:e2e` | Testes e2e |
| `npm run lint` | Lint com oxlint |
| `npm run migration:generate -- src/database/migrations/Nome` | Gera uma migration a partir das entidades |
| `npm run migration:run` / `migration:revert` / `migration:show` | Aplica, desfaz ou lista migrations |

## Autenticação

1. `POST /auth/login` devolve um `accessToken` (15 min) no corpo e um `refresh_token` (7 dias) em um cookie HttpOnly.
2. Nas rotas 🔒, envie `Authorization: Bearer <accessToken>`.
3. Quando o access token expirar (`401`), chame `POST /auth/refresh`. O cookie é enviado automaticamente e um novo par de tokens é emitido.
4. Trocar a senha encerra todas as sessões. O login aceita 5 tentativas por minuto (por IP e e-mail).

No front-end, envie as requisições com `credentials: 'include'` (fetch) ou `withCredentials: true` (axios) e guarde o `accessToken` só em memória.

## Endpoints

🔒 = exige `Authorization: Bearer <accessToken>`

### Health

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verifica se a API está no ar |

### Autenticação

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| POST | `/auth/login` | `email`, `password` | Login: `accessToken` no corpo e refresh token no cookie |
| POST | `/auth/refresh` | — | Troca o refresh token (cookie) por um novo par de tokens |
| POST | `/auth/logout` | — | Encerra a sessão do dispositivo (`204`) |

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| POST | `/users` | Cadastro |
| GET | `/users?page=1&limit=20` 🔒 | Lista paginada |
| GET | `/users/:id` 🔒 | Busca por id |
| PATCH | `/users/:id` 🔒 | Atualiza a própria conta |
| DELETE | `/users/:id` 🔒 | Remove a própria conta (`204`) |

Corpo do `POST /users`:

```json
{
  "username": "Matheus",
  "email": "matheus@email.com",
  "password": "Senha12345",
  "confirmPassword": "Senha12345",
  "seniority": "junior",
  "currentPosition": "Desenvolvedor Backend",
  "birthDate": "1998-05-23",
  "favoritePhrase": "Carpe diem"
}
```

- Obrigatórios: `username`, `email`, `password` (8 a 72 caracteres) e `confirmPassword`.
- `seniority` aceita `junior`, `mid`, `senior` ou `lead`.

`PATCH /users/:id`:
- Aceita os mesmos campos, todos opcionais, exceto `birthDate`.
- Para trocar a senha, envie `password`, `confirmPassword` e `currentPassword`.

### Habilidades

| Método | Rota | Descrição |
|---|---|---|
| GET | `/skills?page=1&limit=20` | Lista paginada |
| GET | `/skills/:id` | Busca por id |
| GET | `/skills/user/:userId` | Habilidades de um usuário |
| POST | `/skills` 🔒 | Cria uma habilidade: `{ "name": "NestJS" }` |
| DELETE | `/skills/:id` 🔒 | Remove (só quem criou, `204`) |

### Respostas

- **Listas paginadas:** `{ "data": [], "total": 0, "page": 1, "limit": 20 }`, com `limit` máximo de 100.
- **Erros:** `{ "message": "...", "error": "Conflict", "statusCode": 409 }`. Em erros de validação (`400`), `message` vem como lista.
- **Códigos comuns:**
  - `400`: dados inválidos ou campos desconhecidos.
  - `401`: sem token ou token inválido.
  - `403`: não é o dono do recurso.
  - `404`: não encontrado.
  - `409`: e-mail ou habilidade já existem.
  - `429`: muitas tentativas.
