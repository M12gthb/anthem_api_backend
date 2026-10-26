# Anthem API

API backend do projeto Anthem, desenvolvida com [NestJS](https://nestjs.com/), TypeORM e PostgreSQL. Permite cadastrar usuários, autenticá-los e gerenciar as habilidades (competências) de cada um.

> 🚧 **Projeto em construção.**

## Sumário

- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Como rodar](#como-rodar)
- [Autenticação](#autenticação)
- [Rotas](#rotas)
- [Testes](#testes)
- [Comandos úteis](#comandos-úteis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)

## Tecnologias

- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [JWT](https://jwt.io/) para autenticação
- [Jest](https://jestjs.io/) e [Supertest](https://github.com/ladjs/supertest) para testes
- [Docker](https://www.docker.com/) e Docker Compose

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- [Node.js](https://nodejs.org/) 22 ou superior (para rodar a API fora do Docker e para executar os testes)

## Configuração

1. Clone o repositório:

   ```bash
   git clone <url-do-repositorio>
   cd anthem_api_backend
   ```

2. Crie o arquivo `.env` na raiz do projeto (use o `.env.example` como base):

   ```env
   # Banco de dados (lido pelo Docker Compose)
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=sua_senha_aqui
   POSTGRES_DB=app

   # API
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5432/app
   JWT_SECRET=troque_por_um_valor_longo_e_aleatorio
   ```

   Para gerar um `JWT_SECRET` seguro:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   > O `.env` não deve ser versionado. Mantenha-o no `.gitignore`.

   > Ao rodar a API dentro do Docker (opção 1 abaixo), o serviço `api` do `docker-compose.yml` define o próprio `DATABASE_URL` (com o host `db`) e também precisa receber o `JWT_SECRET`, por `environment` ou `env_file: .env`.

## Como rodar

### Opção 1: tudo com Docker (API + banco)

```bash
docker compose up --build
```

A API ficará disponível em http://localhost:3000.

Para rodar em segundo plano:

```bash
docker compose up -d --build
```

### Opção 2: API local e só o banco no Docker (recomendado para desenvolvimento)

```bash
npm install
docker compose up -d db
npm run start:dev
```

Neste modo, use `localhost` como host do banco no `DATABASE_URL`. Não deixe o container `api` rodando ao mesmo tempo, porque os dois disputam a porta 3000 (`docker compose stop api`).

## Autenticação

A API usa **JWT**. O fluxo é:

1. Cadastre-se em `POST /users`.
2. Faça login em `POST /auth/login` com `email` e `password`. A resposta traz o `accessToken`.
3. Envie o token nas rotas protegidas, no cabeçalho:

   ```
   Authorization: Bearer <accessToken>
   ```

```http
POST /auth/login
Content-Type: application/json

{ "email": "matheus@email.com", "password": "Senha12345" }
```

| Resposta | Significado |
|---|---|
| `200` | Retorna `{ "accessToken": "..." }` |
| `400` | Corpo inválido |
| `401` | Credenciais inválidas (e-mail inexistente e senha errada têm a mesma resposta) |

## Rotas

Rotas marcadas com 🔒 exigem o cabeçalho `Authorization`. Sem token (ou com token inválido), a resposta é `401`.

### Usuários

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/users` | Cadastra um usuário | Pública |
| `GET` | `/users` | Lista usuários (paginado) | 🔒 |
| `GET` | `/users/:id` | Busca um usuário | 🔒 |
| `PATCH` | `/users/:id` | Atualiza o próprio usuário | 🔒 Só o dono |
| `DELETE` | `/users/:id` | Remove o próprio usuário (soft delete) | 🔒 Só o dono |

#### `POST /users`

- `201`: criado com sucesso, retorna o usuário sem o campo senha
- `409`: e-mail já existe
- `400`: corpo inválido (e-mail mal formatado, senha com menos de 8 caracteres, campo ausente ou que não existe no DTO)

#### `GET /users`

- Query: `?page=1&limit=10`
- `200`: retorna `{ data, total, page, limit }`, sem o campo senha nos usuários
- `401`: não autorizado

#### `GET /users/:id`

- `200`: retorna o usuário sem a senha
- `400`: o `id` não é um UUID válido
- `401`: não autorizado
- `404`: usuário não encontrado

#### `PATCH /users/:id`

- `200`: retorna o usuário atualizado sem a senha
- `400`: campo inválido (inclui `email`, que não pode ser alterado por esta rota, e senha nova sem `currentPassword` ou com `currentPassword` incorreta)
- `401`: não autorizado
- `403`: o token é de outro usuário
- `404`: usuário não encontrado (por exemplo, a conta foi deletada e o token ainda é válido)

Para trocar a senha, envie a nova senha junto com a atual:

```json
{ "password": "NovaSenha456", "currentPassword": "Senha12345" }
```

#### `DELETE /users/:id`

- `204`: usuário deletado (soft delete, sem corpo na resposta)
- `401`: não autorizado
- `403`: o token é de outro usuário
- `404`: usuário não encontrado

### Habilidades

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/skills` | Lista habilidades (paginado) | Pública |
| `GET` | `/skills/:id` | Busca uma habilidade | Pública |
| `GET` | `/skills/user/:userId` | Lista as habilidades de um usuário | Pública |
| `POST` | `/skills` | Cria uma habilidade | 🔒 |
| `DELETE` | `/skills/:id` | Remove uma habilidade | 🔒 Só o dono |

#### `GET /skills`

- Query: `?page=1&limit=20`
- `200`: retorna `{ data, total, page, limit }`

#### `GET /skills/:id`

- `200`: retorna uma habilidade
- `400`: o `id` não é um UUID válido
- `404`: habilidade não encontrada

#### `GET /skills/user/:userId`

- `200`: retorna todas as habilidades de um usuário (lista vazia se ele não tem nenhuma)
- `404`: usuário não encontrado

#### `POST /skills`

- `201`: cria a habilidade e retorna ela
- `400`: corpo inválido (nome vazio, ausente, com mais de 100 caracteres ou campo extra)
- `401`: não autorizado
- `409`: habilidade já existe (ignora maiúsculas e minúsculas)

#### `DELETE /skills/:id`

- `204`: habilidade deletada (sem corpo na resposta)
- `401`: não autorizado
- `403`: o token é de outro usuário (só vale quando existir o conceito de dono da habilidade)
- `404`: habilidade não encontrada

### Formato das respostas

Listas paginadas:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10
}
```

Erros de validação (`400`):

```json
{
  "message": ["email must be an email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

## Testes

Os testes são **e2e** (ponta a ponta): sobem a aplicação, chamam as rotas por HTTP com o Supertest e usam um **banco separado** (`app_test`), para nunca mexer nos dados de desenvolvimento. Antes de cada teste, as tabelas são limpas.

### Preparação (uma vez)

1. Suba o banco e crie o banco de teste:

   ```bash
   docker compose up -d db
   docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE app_test;"'
   ```

2. Crie o arquivo `.env.test` na raiz (use o mesmo usuário e senha do `.env`, apontando para `app_test`):

   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5432/app_test
   JWT_SECRET=segredo_so_para_testes
   ```

   > O nome do banco de teste precisa terminar com `_test`. Uma trava impede que os testes rodem em outro banco, já que eles apagam dados. O `.env.test` também não deve ser versionado.

### Executar

```bash
npm run test:e2e                  # todos os testes
npm run test:e2e -- users         # só o arquivo users.e2e-spec.ts
npm run test:e2e -- -t "409"      # só os testes com "409" no nome
```

Os arquivos de teste rodam em sequência (`--runInBand`), porque compartilham o mesmo banco. Os testes não usam a porta 3000, então podem rodar com a API ligada.

### O que é testado

| Arquivo | Cobertura |
|---|---|
| `test/auth.e2e-spec.ts` | Login com credenciais corretas, senha incorreta, e-mail inexistente e corpo inválido |
| `test/users.e2e-spec.ts` | Cadastro, listagem paginada, busca por id, atualização (perfil e troca de senha), exclusão e regras de dono (`401`, `403`, `404`) |
| `test/skills.e2e-spec.ts` | Listagem paginada, busca por id, habilidades de um usuário, criação (inclui duplicatas) e exclusão |

Resumo dos cenários principais:

| Rota | Cenários verificados |
|---|---|
| `POST /users` | `201` sem senha na resposta, `409` e-mail duplicado, `400` para e-mail inválido, senha curta, username ausente e campo extra |
| `GET /users` | `401` sem token e com token inválido, `200` paginado sem senha |
| `GET /users/:id` | `401`, `200`, `404`, `400` para id que não é UUID |
| `PATCH /users/:id` | `200` atualiza perfil, `200` troca de senha (login novo funciona, antigo falha), `400` para senha sem `currentPassword`, `currentPassword` errada, `email`, enum inválido, data inexistente e campo extra, `401`, `403` conta de outra pessoa, `404` conta deletada |
| `DELETE /users/:id` | `401`, `403`, `204` (depois o usuário some das consultas e não consegue logar), `404` ao repetir |
| `GET /skills` | `200` lista vazia e lista paginada |
| `GET /skills/:id` | `200`, `404`, `400` |
| `GET /skills/user/:userId` | `200` com habilidades, `200` lista vazia, `404` usuário inexistente |
| `POST /skills` | `401`, `201`, `409` duplicada, `400` para nome vazio, ausente, longo demais e campo extra |
| `DELETE /skills/:id` | `401`, `404`, `204`. O caso `403` (só o dono apaga) está marcado como `todo` |

### Estrutura dos testes

```
test/
├── jest-e2e.json          # configuração do Jest para e2e
├── setup-env.ts           # carrega o .env.test e valida o banco de teste
├── utils/
│   └── test-app.ts        # cria o app, limpa o banco e faz cadastro + login
├── auth.e2e-spec.ts
├── users.e2e-spec.ts
└── skills.e2e-spec.ts
```

## Comandos úteis

| Comando | Descrição |
|---|---|
| `npm run start:dev` | Inicia a API com hot reload |
| `npm run build` | Compila o projeto |
| `npm run test:e2e` | Executa os testes e2e |
| `docker compose logs -f api` | Mostra os logs da API |
| `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` | Abre o `psql` dentro do container |
| `docker compose stop api` | Para só o container da API (libera a porta 3000) |
| `docker compose down` | Para os containers (os dados são mantidos) |
| `docker compose down -v` | Para os containers e **apaga os dados do banco** |

## Estrutura do projeto

```
src/
├── main.ts                # Ponto de entrada
├── app.module.ts          # Módulo raiz (config, banco e módulos)
├── app.setup.ts           # Configuração compartilhada com os testes (ValidationPipe)
├── common/                # Guards, decorators, middlewares e DTOs compartilhados
└── modules/
    ├── auth/              # Login e geração do token
    ├── users/             # Usuários (controller, service, entity, dto, errors)
    └── skills/            # Habilidades (controller, service, entity, dto, errors)
test/                      # Testes e2e
```

## Modelo de dados

- **users**: `id`, `username`, `email` (único), `password` (hash), `seniority` (enum: `junior`, `mid`, `senior`, `lead`), `current_position`, `birth_date`, `created_at`, `updated_at`, `deleted_at`
- **skill**: `id`, `name`
- **user_skill**: tabela intermediária (relação muitos-para-muitos entre usuários e habilidades), com chave primária composta `(user_id, skill_id)`

## Roadmap

- [x] Configuração inicial do NestJS
- [x] Docker e Docker Compose com PostgreSQL
- [x] Modelagem dos dados (DER, entities e DTOs)
- [ ] Endpoints de usuários
- [ ] Autenticação com JWT
- [ ] Endpoints de habilidades
- [ ] Testes e2e passando
- [ ] Vínculo de habilidades a usuários
- [ ] Migrations no lugar do `synchronize`
- [ ] Documentação com Swagger
