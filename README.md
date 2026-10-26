# Anthem API

API backend do projeto Anthem, desenvolvida com [NestJS](https://nestjs.com/), TypeORM e PostgreSQL. Permite cadastrar usuários, autenticá-los com JWT e gerenciar as habilidades (competências) de cada um. A API é documentada com Swagger e coberta por testes e2e.

> 🚧 **Projeto em construção.**

## Sumário

- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Como rodar](#como-rodar)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Autenticação](#autenticação)
- [Rotas](#rotas)
- [Testes](#testes)
- [Comandos úteis](#comandos-úteis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Modelo de dados](#modelo-de-dados)
- [Problemas comuns](#problemas-comuns)
- [Convenção de commits](#convenção-de-commits)
- [Roadmap](#roadmap)

## Tecnologias

- [NestJS](https://nestjs.com/) (ESM)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [JWT](https://jwt.io/) para autenticação e [bcrypt](https://github.com/kelektiv/node.bcrypt.js) para o hash das senhas
- [class-validator](https://github.com/typestack/class-validator) e [class-transformer](https://github.com/typestack/class-transformer) para validação dos DTOs
- [Swagger](https://swagger.io/) (`@nestjs/swagger`) para a documentação interativa
- [Vitest](https://vitest.dev/) e [Supertest](https://github.com/ladjs/supertest) para os testes e2e
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
   POSTGRES_DB=anthem

   # API
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5433/anthem
   JWT_SECRET=troque_por_um_valor_longo_e_aleatorio

   # Opcional: desliga a documentação em /docs
   # SWAGGER_ENABLED=false
   ```

   Para gerar um `JWT_SECRET` seguro:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   > O `DATABASE_URL` precisa ser a **URL completa** de conexão (`postgresql://usuario:senha@host:porta/banco`), com os mesmos valores de `POSTGRES_*`. Se a senha tiver caracteres especiais (`@`, `:`, `/`, `#`), eles precisam ser codificados na URL.

   > O `.env` não deve ser versionado. Mantenha-o no `.gitignore`.

### Porta do banco: 5433

O `docker-compose.yml` publica o Postgres do container na porta **5433** do seu computador (`"5433:5432"`), e não na 5432. Assim ele não conflita com um PostgreSQL instalado localmente. Dentro da rede do Docker, a API continua acessando o banco por `db:5432`, então só quem conecta de fora (a API rodando local, os testes e clientes como DBeaver) usa a `5433`.

Ao rodar a API dentro do Docker (opção 1 abaixo), o serviço `api` do `docker-compose.yml` define o próprio `DATABASE_URL` (com o host `db`) e recebe o `JWT_SECRET` pelo `environment`:

```yaml
  api:
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
```

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

> **Atenção:** a imagem roda com `NODE_ENV=production`, e nesse modo o `synchronize` do TypeORM fica desligado. Enquanto o projeto não usar migrations (veja o [roadmap](#roadmap)), as tabelas não são criadas por esta opção. Use a opção 2 para desenvolver.

### Opção 2: API local e só o banco no Docker (recomendado para desenvolvimento)

```bash
npm install
docker compose up -d db
npm run start:dev
```

Neste modo, a API usa `localhost:5433` no `DATABASE_URL` e o TypeORM cria as tabelas automaticamente na primeira conexão (`synchronize`, fora de produção). Não deixe o container `api` rodando ao mesmo tempo, porque os dois disputam a porta 3000 (`docker compose stop api`).

## Documentação da API (Swagger)

Com a API no ar, a documentação interativa fica em:

- **http://localhost:3000/docs**: interface do Swagger
- **http://localhost:3000/docs-json**: especificação OpenAPI em JSON

Para testar as rotas protegidas pelo navegador:

1. Crie um usuário em `POST /users` (botão **Try it out**).
2. Faça login em `POST /auth/login` e copie o `accessToken` da resposta.
3. Clique em **Authorize** (cadeado no topo), cole o token **sem** o prefixo `Bearer` e confirme.
4. As rotas com cadeado passam a funcionar.

Para desligar a documentação (por exemplo, em produção), defina `SWAGGER_ENABLED=false`.

Notas para quem for evoluir os DTOs:

- O plugin do Swagger para o `nest-cli` **não é usado** (ele gera imports incompatíveis com o ESM). Por isso, cada campo de DTO precisa de `@ApiProperty()` (ou `@ApiPropertyOptional()`) para aparecer na documentação.
- Campos que aceitam `null` precisam do tipo explícito, por exemplo `@ApiProperty({ type: String, nullable: true })`.
- No `UpdateUserDto`, use `PartialType` e `OmitType` de `@nestjs/swagger`, e não de `@nestjs/mapped-types`, para herdar também a documentação.

## Autenticação

A API usa **JWT**. O fluxo é:

1. Cadastre-se em `POST /users`.
2. Faça login em `POST /auth/login` com `email` e `password`. A resposta traz o `accessToken`.
3. Envie o token nas rotas protegidas, no cabeçalho:

   ```
   Authorization: Bearer <accessToken>
   ```

Como funciona por dentro:

- No login, a API compara a senha enviada com o **hash** salvo no banco (`bcrypt`) e, se bater, gera um token assinado com o `JWT_SECRET`. O token guarda o `id` do usuário (campo `sub`) e **expira em 1 hora**.
- Nas rotas protegidas, o `JwtAuthGuard` valida a assinatura e a validade do token e guarda o `id` em `request.user`. O decorator `@CurrentUser()` entrega esse `id` ao controller.
- A identidade vem **sempre do token**, nunca do corpo ou da URL. É assim que a API garante que só o dono da conta consegue alterá-la (`403` caso contrário).
- Contas removidas (soft delete) não conseguem fazer login.

Limitações conhecidas:

- O token não pode ser cancelado antes de expirar.
- Trocar a senha não invalida os tokens já emitidos.
- Não há limite de tentativas de login.

## Rotas

Rotas marcadas com 🔒 exigem o cabeçalho `Authorization`. Sem token, com token malformado, assinado com outra chave ou expirado, a resposta é `401`.

Todas as listas paginadas aceitam `?page=1&limit=20`. O padrão é `page=1` e `limit=20`; `page` deve ser no mínimo 1 e `limit` fica entre 1 e 100 (valores fora disso retornam `400`).

### Autenticação

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/auth/login` | Autentica o usuário e devolve o token de acesso | Pública |

#### `POST /auth/login`

- Corpo: `email` e `password`
- `200`: retorna `{ "accessToken": "..." }` (token válido por 1 hora)
- `400`: corpo inválido (e-mail mal formatado ou senha vazia)
- `401`: credenciais inválidas (e-mail inexistente, senha errada ou conta removida; a resposta é a mesma nos três casos, para não revelar quais e-mails têm conta)

Exemplo:

```http
POST /auth/login
Content-Type: application/json

{ "email": "matheus@email.com", "password": "Senha12345" }
```

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Uso do token em uma rota protegida:

```http
GET /users/3f1c0000-0000-4000-8000-000000000000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Usuários

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/users` | Cadastra um usuário | Pública |
| `GET` | `/users` | Lista usuários (paginado) | 🔒 |
| `GET` | `/users/:id` | Busca um usuário | 🔒 |
| `PATCH` | `/users/:id` | Atualiza o próprio usuário | 🔒 Só o dono |
| `DELETE` | `/users/:id` | Remove o próprio usuário (soft delete) | 🔒 Só o dono |

#### `POST /users`

- Corpo: `username`, `email` e `password` (obrigatórios); `seniority`, `currentPosition` e `birthDate` (opcionais)
- `201`: criado com sucesso, retorna o usuário sem o campo senha
- `409`: e-mail já existe (inclui e-mails de contas removidas)
- `400`: corpo inválido (e-mail mal formatado, senha fora de 8 a 72 caracteres, campo ausente ou que não existe no DTO)

#### `GET /users`

- `200`: retorna `{ data, total, page, limit }`, sem o campo senha nos usuários
- `400`: `page` ou `limit` inválidos
- `401`: não autorizado

#### `GET /users/:id`

- `200`: retorna o usuário sem a senha
- `400`: o `id` não é um UUID válido
- `401`: não autorizado
- `404`: usuário não encontrado

#### `PATCH /users/:id`

- `200`: retorna o usuário atualizado sem a senha
- `400`: campo inválido (inclui `email`, que não pode ser alterado por esta rota, senha nova sem `currentPassword`, `currentPassword` incorreta, data de nascimento no futuro e corpo vazio)
- `401`: não autorizado
- `403`: o token é de outro usuário
- `404`: usuário não encontrado (por exemplo, a conta foi removida e o token ainda é válido)

Para trocar a senha, envie a nova senha junto com a atual:

```json
{ "password": "NovaSenha456", "currentPassword": "Senha12345" }
```

Para limpar um campo opcional, envie `null` (por exemplo, `{ "currentPosition": null }`). Campos ausentes não são alterados.

#### `DELETE /users/:id`

- `204`: usuário removido (soft delete, sem corpo na resposta)
- `401`: não autorizado
- `403`: o token é de outro usuário
- `404`: usuário não encontrado

### Habilidades

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/skills` | Lista habilidades (paginado, em ordem alfabética) | Pública |
| `GET` | `/skills/user/:userId` | Lista as habilidades de um usuário | Pública |
| `GET` | `/skills/:id` | Busca uma habilidade | Pública |
| `POST` | `/skills` | Cria uma habilidade | 🔒 |
| `DELETE` | `/skills/:id` | Remove uma habilidade | 🔒 Só o dono |

Quem cria uma habilidade passa a ser o **dono** (coluna `created_by`), e só o dono pode removê-la. O campo `created_by` não aparece nas respostas.

#### `GET /skills`

- `200`: retorna `{ data, total, page, limit }`
- `400`: `page` ou `limit` inválidos

#### `GET /skills/user/:userId`

- `200`: retorna todas as habilidades de um usuário (lista vazia se ele não tem nenhuma)
- `400`: o `userId` não é um UUID válido
- `404`: usuário não encontrado

#### `GET /skills/:id`

- `200`: retorna uma habilidade
- `400`: o `id` não é um UUID válido
- `404`: habilidade não encontrada

#### `POST /skills`

- Corpo: `name` (até 100 caracteres)
- `201`: cria a habilidade e retorna ela
- `400`: corpo inválido (nome vazio, ausente, com mais de 100 caracteres ou campo extra)
- `401`: não autorizado
- `409`: habilidade já existe (ignora maiúsculas e minúsculas)

#### `DELETE /skills/:id`

- `204`: habilidade removida (sem corpo na resposta). Os vínculos dela com os usuários também são removidos
- `400`: o `id` não é um UUID válido
- `401`: não autorizado
- `403`: o token é de outro usuário (não é o dono da habilidade)
- `404`: habilidade não encontrada

### Formato das respostas

Listas paginadas:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
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

Demais erros (`401`, `403`, `404`, `409`):

```json
{
  "message": "E-mail já cadastrado",
  "error": "Conflict",
  "statusCode": 409
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

2. Crie o arquivo `.env.test` na raiz (use o mesmo usuário e senha do `.env`, a porta `5433` e o banco `app_test`):

   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5433/app_test
   JWT_SECRET=segredo_so_para_testes
   ```

   > O nome do banco de teste precisa terminar com `_test`. Uma trava (`test/setup-env.ts`) impede que os testes rodem em outro banco, já que eles apagam dados. O `.env.test` também não deve ser versionado.

3. Instale as dependências de teste (se ainda não estiverem no projeto):

   ```bash
   npm install -D vitest unplugin-swc @swc/core supertest @types/supertest dotenv
   ```

   O `unplugin-swc` é necessário porque o Nest depende dos metadados dos decorators (`emitDecoratorMetadata`), que o compilador padrão do Vitest não gera.

### Executar

```bash
npm run test:e2e                  # todos os testes
npm run test:e2e -- users         # só o arquivo users.e2e-spec.ts
npm run test:e2e -- -t "409"      # só os testes com "409" no nome
```

O script usa `vitest run --config ./vitest.config.e2e.ts`. Os arquivos de teste rodam **em sequência** (`fileParallelism: false`), porque compartilham o mesmo banco. Os testes não usam a porta 3000, então podem rodar com a API ligada.

No total são **56 testes**.

### O que é testado

| Arquivo | Testes | Cobertura |
|---|---|---|
| `test/auth.e2e-spec.ts` | 8 | Login (credenciais corretas, senha incorreta, e-mail inexistente e corpo inválido) e proteção das rotas pelo `JwtAuthGuard` (cabeçalho sem `Bearer`, esquema diferente, token assinado com outra chave e token expirado) |
| `test/users.e2e-spec.ts` | 28 | Cadastro, listagem paginada, busca por id, atualização (perfil e troca de senha), exclusão e regras de dono (`401`, `403`, `404`) |
| `test/skills.e2e-spec.ts` | 20 | Listagem paginada, busca por id, habilidades de um usuário, criação (inclui duplicatas), exclusão e regra do dono |

Resumo dos cenários principais:

| Rota | Cenários verificados |
|---|---|
| `POST /auth/login` | `200` com `accessToken`, `401` senha incorreta, `401` e-mail inexistente, `400` corpo inválido |
| Rotas protegidas (`JwtAuthGuard`) | `401` para cabeçalho sem `Bearer`, esquema `Basic`, token assinado com outra chave e token expirado |
| `POST /users` | `201` sem senha na resposta, `409` e-mail duplicado, `400` para e-mail inválido, senha curta, username ausente e campo extra |
| `GET /users` | `401` sem token e com token inválido, `200` paginado sem senha |
| `GET /users/:id` | `401`, `200`, `404`, `400` para id que não é UUID |
| `PATCH /users/:id` | `200` atualiza perfil, `200` troca de senha (login novo funciona, antigo falha), `400` para senha sem `currentPassword`, `currentPassword` errada, `email`, enum inválido, data inexistente e campo extra, `401`, `403` conta de outra pessoa, `404` conta removida |
| `DELETE /users/:id` | `401`, `403`, `204` (depois o usuário some das consultas e não consegue logar), `404` ao repetir |
| `GET /skills` | `200` lista vazia e lista paginada |
| `GET /skills/:id` | `200`, `404`, `400` |
| `GET /skills/user/:userId` | `200` com habilidades, `200` lista vazia, `404` usuário inexistente |
| `POST /skills` | `401`, `201`, `409` duplicada, `400` para nome vazio, ausente, longo demais e campo extra |
| `DELETE /skills/:id` | `401`, `404`, `403` (só o dono apaga), `204`, `204` removendo também os vínculos com os usuários |

### Estrutura dos testes

```
vitest.config.e2e.ts       # configuração do Vitest para e2e (raiz do projeto)
test/
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
| `docker compose up -d db` | Sobe só o banco |
| `docker compose ps` | Mostra os containers e as portas |
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
├── swagger.setup.ts       # Configuração do Swagger (/docs)
├── common/
│   ├── decorators/        # @CurrentUser()
│   ├── dto/               # DTOs compartilhados (paginação)
│   └── guards/            # JwtAuthGuard
└── modules/
    ├── auth/              # Login e geração do token (controller, service, dto, erros)
    ├── users/             # Usuários (controller, service, entity, dto, erros)
    └── skills/            # Habilidades (controller, service, entity, dto, erros)
test/                      # Testes e2e
```

Os erros de cada módulo estendem as exceções do próprio Nest (`ConflictException`, `NotFoundException`...), então o status HTTP já vem embutido e não é preciso um filtro de exceções.

## Modelo de dados

```mermaid
erDiagram
  USERS ||--o{ USER_SKILL : possui
  SKILL ||--o{ USER_SKILL : atribuida_em
  USERS {
    uuid id PK
    varchar username
    varchar email UK
    varchar password
    seniority_level seniority
    varchar current_position
    date birth_date
    timestamp created_at
    timestamp updated_at
    timestamp deleted_at
  }
  SKILL {
    uuid id PK
    varchar name UK
    uuid created_by
  }
  USER_SKILL {
    uuid user_id PK, FK
    uuid skill_id PK, FK
  }
```

- **users**: `password` guarda o **hash** da senha, nunca a senha. `seniority` é um enum (`junior`, `mid`, `senior`, `lead`). `deleted_at` habilita o soft delete.
- **skill**: `name` é único (sem diferenciar maiúsculas de minúsculas na API). `created_by` guarda o id do dono.
- **user_skill**: tabela intermediária da relação muitos-para-muitos entre usuários e habilidades, com chave primária composta `(user_id, skill_id)` e `ON DELETE CASCADE` nas duas chaves estrangeiras.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `EADDRINUSE ... :3000` | O container `api` ou outro `start:dev` está usando a porta | `docker compose stop api`, ou encerre o processo antigo |
| `Configuration key "JWT_SECRET" does not exist` | Falta `JWT_SECRET` no `.env` | Gere um valor (veja [Configuração](#configuração)) e reinicie a API |
| Erro de conexão com `localhost` como `DATABASE_URL` | O `DATABASE_URL` precisa ser a URL completa | Use `postgresql://usuario:senha@localhost:5433/banco` |
| `banco de dados "app_test" não existe` (em português) | A conexão está caindo em um PostgreSQL local, na porta 5432 | Use a porta `5433` no `.env.test` e confirme com `docker compose ps` |
| `database "app_test" does not exist` (em inglês) | Falta criar o banco de teste | Rode o `CREATE DATABASE` da seção de testes |
| `role "..." does not exist` | Usuário diferente do `POSTGRES_USER` | Conecte com o usuário definido no `.env` |
| `ERR_MODULE_NOT_FOUND` apontando para `src/...` | O plugin do Swagger no `nest-cli.json` | Remova o bloco `plugins` e apague `dist` e os `*.tsbuildinfo` |
| `Nest can't resolve dependencies of the JwtAuthGuard` | O `AuthModule` não está no `AppModule` | Importe o `AuthModule` |
| `Entity metadata for User#skills was not found` | O `SkillsModule` não está no `AppModule` | Importe o `SkillsModule` |
| Tabelas não criadas ao rodar pelo Docker | A imagem roda com `NODE_ENV=production` (sem `synchronize`) | Use a opção 2 até existirem migrations |

## Convenção de commits

O projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição curta>
```

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Mudanças só na documentação |
| `style` | Formatação, sem mudar lógica |
| `refactor` | Reescrita de código sem mudar o comportamento |
| `perf` | Melhoria de desempenho |
| `test` | Criação ou ajuste de testes |
| `build` | Build, dependências, Dockerfile, `package.json` |
| `ci` | Pipelines de CI/CD |
| `chore` | Tarefas de manutenção |
| `revert` | Reverte um commit anterior |

Exemplos: `feat(auth): add login route with JWT`, `test(users): add e2e tests`, `docs: update README`.

## Roadmap

- [x] Configuração inicial do NestJS
- [x] Docker e Docker Compose com PostgreSQL
- [x] Modelagem dos dados (DER, entities e DTOs)
- [x] Endpoints de usuários
- [x] Autenticação com JWT
- [x] Endpoints de habilidades (com regra de dono)
- [x] Testes e2e (56 testes)
- [x] Documentação com Swagger
- [ ] Vínculo de habilidades a usuários (`/users/me/skills`)
- [ ] Refresh token e limite de tentativas de login
- [ ] Migrations no lugar do `synchronize`
