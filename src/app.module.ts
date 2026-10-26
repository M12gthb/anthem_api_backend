import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/user.module.js';
import { SkillsModule } from './modules/skills/skill.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // 1. Variáveis de ambiente (.env), disponíveis em toda a aplicação
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Conexão com o Postgres
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),

    // 3. Telemetria (opcional)
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'anthem_api_backend',
    }),

    // 4. Módulos de funcionalidade
    UsersModule, // rotas /users
    AuthModule, // rota /auth/login e registro global do JwtService
    SkillsModule, // rotas /skills (e registra a entity Skill)
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}