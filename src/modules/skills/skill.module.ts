import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { UsersModule } from '../users/user.module.js';
import { Skill } from './entities/skill.entity.js';
import { SkillsController } from './skill.controller.js';
import { SkillsService } from './skill.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, User]), UsersModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}