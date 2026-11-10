import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { validateEnv } from './config/env.validation.js';
import { baseDataSourceOptions } from './database/typeorm.options.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/user.module.js';
import { SkillsModule } from './modules/skills/skill.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return {
          ...baseDataSourceOptions(config.getOrThrow<string>('DATABASE_URL')),
          autoLoadEntities: true,
          // em dev/teste o schema acompanha as entidades;
          // em produção o schema só muda por migrations, aplicadas ao subir a API
          synchronize: !isProduction,
          migrationsRun: isProduction,
        };
      },
    }),

    // só envia telemetria quando as chaves do Observe estão configuradas
    ObserveModule.forRoot({
      enabled: Boolean(
        process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET,
      ),
      serviceId: 'anthem_api_backend',
    }),

    HealthModule,
    UsersModule,
    AuthModule,
    SkillsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
