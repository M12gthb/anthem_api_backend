import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configureApp } from './app.setup.js';
import { setupSwagger } from './swagger.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  configureApp(app);

  // documentação: ligada por padrão em dev; em produção só com SWAGGER_ENABLED=true
  const swaggerDefault =
    process.env.NODE_ENV === 'production' ? 'false' : 'true';
  if ((process.env.SWAGGER_ENABLED ?? swaggerDefault) === 'true') {
    setupSwagger(app);
  }

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
