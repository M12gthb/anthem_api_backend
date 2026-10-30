# Anthem API

API de um gerenciador de carreira: cadastro de usuários, autenticação com JWT e gerenciamento de habilidades (skills). Feita com NestJS, TypeORM e PostgreSQL.

> 🚧 **Projeto em construção.**

- Documentação interativa (Swagger): `http://localhost:3000/docs` (ou `3001` se a API rodar pelo Docker)
- Quer contribuir ou entender o código por dentro? Veja [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md).

## Sumário

- [Começando](#começando)
- [Como a autenticação funciona](#como-a-autenticação-funciona)
- [Rotas](#rotas)
- [Regras importantes](#regras-importantes)
- [Formato das respostas](#formato-das-respostas)
- [Integrando com um front-end](#integrando-com-um-front-end)

## Começando

Você precisa de [Docker](https://docs.docker.com/get-docker/) e [Node.js](https://nodejs.org/) 22+.

```bash
git clone <url-do-repositorio>
cd anthem_api_backend
cp .env.example .env        # preencha as senhas e o JWT_SECRET
npm install
docker compose up -d db     # sobe o PostgreSQL (porta 5433)
npm run start:dev           # API em http://localhost:3000
```

Variáveis mínimas do `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_aqui
POSTGRES_DB=anthem
DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5433/anthem
JWT_SECRET=um_valor_longo_e_aleatorio
```

Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Todas as variáveis, o modo 100% Docker e os testes estão em [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md).

## Como a autenticação funciona

A API usa dois tokens:

| Token | Onde vive | Duração | Para quê |
|---|---|---|---|
| **Access token** (JWT) | Corpo da resposta do login; você envia no cabeçalho `Authorization` | 15 minutos | Acessar as rotas protegidas 🔒 |
| **Refresh token** | Cookie `HttpOnly` chamado `refresh_token` (só o navegador enxerga) | 7 dias | Pedir um novo access token sem pedir a senha de novo |

Fluxo:

1. `POST /users` cria a conta.
2. `POST /auth/login` devolve `{ "accessToken": "..." }` e grava o cookie `refresh_token`.
3. Nas rotas 🔒, envie `Authorization: Bearer <accessToken>`.
4. Quando o access token expirar (`401`), chame `POST /auth/refresh`. O navegador envia o cookie sozinho e a API devolve um novo `accessToken` (e troca o cookie por um novo).
5. `POST /auth/logout` encerra a sessão naquele dispositivo.

Detalhes que importam:

- **Trocar a senha encerra todas as sessões** (todos os dispositivos): os tokens antigos passam a retornar `401` na hora.
- Cada refresh token só vale **uma vez**. Reusar um token já trocado derruba a sessão inteira (proteção contra roubo de token).
- **Limite de login:** 5 tentativas por minuto por combinação de IP + e-mail. Passou disso, a API responde `429` com o cabeçalho `Retry-After` (segundos). Enquanto durar o bloqueio, até a senha correta é recusada.
- Contas removidas não conseguem logar e seus tokens deixam de funcionar imediatamente.

## Rotas

Rotas com 🔒 exigem `Authorization: Bearer <accessToken>`. Sem token, com token inválido ou expirado, a resposta é `401`.

Listas paginadas aceitam `?page=1&limit=20` (`page` ≥ 1; `limit` de 1 a 100; valores fora disso retornam `400`).

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/auth/login` | Autentica e devolve o access token + cookie | Pública (limite de 5/min) |
| `POST` | `/auth/refresh` | Renova o access token usando o cookie | Cookie |
| `POST` | `/auth/logout` | Encerra a sessão do dispositivo | Cookie |
| `POST` | `/users` | Cadastra um usuário | Pública |
| `GET` | `/users` | Lista usuários (paginado) | 🔒 |
| `GET` | `/users/:id` | Busca um usuário | 🔒 |
| `PATCH` | `/users/:id` | Atualiza o próprio usuário | 🔒 só o dono |
| `DELETE` | `/users/:id` | Remove o próprio usuário | 🔒 só o dono |
| `GET` | `/skills` | Lista habilidades (paginado, ordem alfabética) | Pública |
| `GET` | `/skills/:id` | Busca uma habilidade | Pública |
| `GET` | `/skills/user/:userId` | Habilidades de um usuário | Pública |
| `POST` | `/skills` | Cria uma habilidade | 🔒 |
| `DELETE` | `/skills/:id` | Remove uma habilidade | 🔒 só o dono |

### Autenticação

#### `POST /auth/login`

Corpo: `email`, `password`.

```json
{ "email": "matheus@email.com", "password": "Senha12345" }
```

`200`:

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

E o cabeçalho `Set-Cookie: refresh_token=...; HttpOnly; Path=/auth; SameSite=Lax`.

| Status | Quando |
|---|---|
| `400` | E-mail mal formatado ou senha vazia |
| `401` | E-mail inexistente, senha errada ou conta removida (a resposta é igual nos três casos) |
| `429` | Mais de 5 tentativas no último minuto |

#### `POST /auth/refresh`

Sem corpo. Lê o cookie `refresh_token`.

`200`:

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

O cookie é substituído por um novo. `401` se o cookie não existir, estiver expirado, já tiver sido usado, tiver sido revogado (logout ou troca de senha) ou a conta tiver sido removida.

#### `POST /auth/logout`

Sem corpo. `204`: sessão encerrada e cookie apagado. Sempre responde `204`, mesmo sem cookie. Outros dispositivos continuam logados.

### Usuários

#### `POST /users`

Obrigatórios: `username`, `email`, `password` (8 a 72 caracteres) e `confirmPassword` (igual a `password`). Opcionais: `seniority` (`junior`, `mid`, `senior`, `lead`), `currentPosition`, `favoritePhrase` (até 255 caracteres) e `birthDate` (não pode estar no futuro).

```json
{
  "username": "Matheus",
  "email": "matheus@email.com",
  "password": "Senha12345",
  "confirmPassword": "Senha12345",
  "favoritePhrase": "Carpe diem"
}
```

`201`:

```json
{
  "id": "3f1c0000-0000-4000-8000-000000000000",
  "username": "Matheus",
  "email": "matheus@email.com",
  "seniority": null,
  "currentPosition": null,
  "birthDate": null,
  "favoritePhrase": "Carpe diem",
  "createdAt": "2026-10-30T12:00:00.000Z"
}
```

| Status | Quando |
|---|---|
| `400` | Campo inválido, `confirmPassword` ausente ou diferente, campo que não existe na API |
| `409` | E-mail já cadastrado (inclui contas removidas) |

#### `GET /users` 🔒

`200`: `{ "data": [...], "total": 0, "page": 1, "limit": 20 }`. Nunca traz senhas.

#### `GET /users/:id` 🔒

`200` com o usuário; `400` se o `id` não for um UUID; `404` se não existir.

#### `PATCH /users/:id` 🔒 só o dono

Todos os campos são opcionais, mas é preciso enviar pelo menos um: `username`, `email`, `seniority`, `currentPosition`, `favoritePhrase`, `password`, `confirmPassword`, `currentPassword`. Campos ausentes não mudam; envie `null` para limpar um campo opcional.

Trocar a frase favorita:

```json
{ "favoritePhrase": "Carpe diem" }
```

Limpar a frase:

```json
{ "favoritePhrase": null }
```

Trocar o e-mail:

```json
{ "email": "novo@email.com" }
```

Trocar a senha (exige a senha atual e a confirmação):

```json
{
  "password": "NovaSenha456",
  "confirmPassword": "NovaSenha456",
  "currentPassword": "Senha12345"
}
```

| Status | Quando |
|---|---|
| `200` | Retorna o usuário atualizado |
| `400` | Corpo vazio; `birthDate` (não pode ser alterada); senha sem `currentPassword`, com `currentPassword` errada ou sem `confirmPassword`; `confirmPassword` sem `password`; campo desconhecido |
| `401` | Token ausente, inválido, expirado ou de conta removida |
| `403` | O token pertence a outro usuário |
| `409` | O e-mail novo já pertence a outra conta |

#### `DELETE /users/:id` 🔒 só o dono

`204` (remoção lógica, sem corpo). `401` e `403` como acima. Depois disso, a conta some das consultas e não consegue mais logar.

### Habilidades

#### `POST /skills` 🔒

```json
{ "name": "TypeScript" }
```

`201` com a habilidade criada. `400` para nome vazio, ausente ou com mais de 100 caracteres; `409` se já existir (sem diferenciar maiúsculas de minúsculas). Quem cria passa a ser o dono.

#### `GET /skills`, `GET /skills/:id`, `GET /skills/user/:userId`

`200` com o resultado (a primeira é paginada: `{ data, total, page, limit }`). `400` para UUID inválido; `404` se a habilidade ou o usuário não existir. `GET /skills/user/:userId` devolve lista vazia se o usuário não tiver nenhuma.

#### `DELETE /skills/:id` 🔒 só o dono

`204` (os vínculos com usuários também são removidos). `400`, `401`, `403` (não é o dono) e `404`.

## Regras importantes

- O e-mail é **único** entre todas as contas, inclusive as removidas. Ele pode ser alterado com `PATCH /users/:id`; depois da troca, só o e-mail novo faz login.
- `birthDate` só pode ser definida no cadastro.
- `confirmPassword` só valida a senha; nunca é salvo nem retornado.
- Só o dono altera ou remove a própria conta (`403` caso contrário). A identidade vem sempre do token, nunca do corpo.
- Campos que a API não conhece são recusados com `400`.

## Formato das respostas

Listas paginadas:

```json
{ "data": [], "total": 0, "page": 1, "limit": 20 }
```

Erro de validação (`400`), com `message` em lista:

```json
{
  "message": ["email must be an email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

Demais erros (`401`, `403`, `404`, `409`, `429`):

```json
{
  "message": "This email address is already in use",
  "error": "Conflict",
  "statusCode": 409
}
```

## Integrando com um front-end

- Envie as requisições com cookies: `fetch(url, { credentials: 'include' })` ou `axios` com `withCredentials: true`. Sem isso o navegador não guarda nem envia o `refresh_token`.
- Guarde o `accessToken` **em memória** (variável/estado), não em `localStorage`. Ao recarregar a página, chame `POST /auth/refresh` para recuperá-lo.
- Ao receber `401` em uma rota 🔒, chame `POST /auth/refresh` uma vez e repita a requisição. Se o refresh também der `401`, redirecione para o login.
- A API só aceita requisições de navegador vindas da origem configurada em `FRONTEND_URL` (padrão `http://localhost:3002`).
- Se o front-end e a API ficarem em domínios diferentes em produção, o navegador pode bloquear o cookie como "de terceiros". O caminho mais simples é servir os dois sob o mesmo site (mesmo domínio raiz, ou um proxy/rewrite no front-end). Detalhes em [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md#cookies-samesite-e-domínios).