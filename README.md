# Anthem API

API backend do projeto Anthem, desenvolvida com [NestJS](https://nestjs.com/), TypeORM e PostgreSQL.

> 🚧 **Projeto em construção.**

## Tecnologias

- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) e Docker Compose

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- [Node.js](https://nodejs.org/) 22 ou superior (somente para rodar sem Docker)

## Configuração

1. Clone o repositório:

```bash
   git clone <url-do-repositorio>
   cd anthem_api_backend
```

2. Crie o arquivo `.env` na raiz do projeto (use o `.env.example` como base):

```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=sua_senha_aqui
   POSTGRES_DB=app
```

   > O `.env` não deve ser versionado. Mantenha-o no `.gitignore`.

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

Neste modo, use `localhost` como host do banco no `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5432/app
```
