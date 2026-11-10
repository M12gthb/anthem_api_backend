import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication) {
  // atrás de proxy (Render), o IP real do usuário vem no X-Forwarded-For.
  // TRUST_PROXY = quantos proxies ficam na frente da API. Sem isso, o rate limit
  // de login enxerga o mesmo IP para todo mundo
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) {
    (app.getHttpAdapter().getInstance() as Express).set(
      'trust proxy',
      trustProxy,
    );
  }

  // CORS só para as origens do front listadas em FRONTEND_URL (separadas por vírgula).
  // Sem FRONTEND_URL, nenhuma origem externa é liberada (ex.: front usando proxy/rewrite)
  const origins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (origins.length) {
    app.enableCors({
      origin: origins,
      credentials: true, // necessário para o navegador enviar o cookie do refresh token
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    });
  }

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
