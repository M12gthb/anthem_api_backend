import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserNotFoundError } from '../users/erros/user-not-found.error.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { SkillResponseDto } from './dto/skill-response.dto.js';
import { Skill } from './entities/skill.entity.js';
import { NotSkillOwnerError } from './erros/not-skill-owner.error.js';
import { SkillAlreadyExistsError } from './erros/skill-already-exists.error.js';
import { SkillNotFoundError } from './erros/skill-not-found.error.js';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateSkillDto, requesterId: string): Promise<SkillResponseDto> {
    // compara sem diferenciar maiúsculas: "NestJS" e "nestjs" são a mesma habilidade
    const exists = await this.skillsRepository
      .createQueryBuilder('skill')
      .where('LOWER(skill.name) = LOWER(:name)', { name: dto.name })
      .getExists();
    if (exists) throw new SkillAlreadyExistsError(dto.name);

    try {
      const saved = await this.skillsRepository.save(
        this.skillsRepository.create({ name: dto.name, createdById: requesterId }),
      );
      return this.toResponse(saved);
    } catch (error) {
      // duas requisições iguais ao mesmo tempo: o banco barra a segunda
      if (this.isUniqueViolation(error)) throw new SkillAlreadyExistsError(dto.name);
      throw error;
    }
  }

  async findAll(page: number, limit: number) {
    const [skills, total] = await this.skillsRepository.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: skills.map((skill) => this.toResponse(skill)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<SkillResponseDto> {
    const skill = await this.skillsRepository.findOneBy({ id });
    if (!skill) throw new SkillNotFoundError();

    return this.toResponse(skill);
  }

  async findByUser(userId: string): Promise<SkillResponseDto[]> {
    // usuário deletado (soft delete) conta como inexistente
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { skills: true },
      order: { skills: { name: 'ASC' } },
    });
    if (!user) throw new UserNotFoundError();

    return user.skills.map((skill) => this.toResponse(skill));
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const skill = await this.skillsRepository.findOneBy({ id });
    if (!skill) throw new SkillNotFoundError();

    if (skill.createdById !== requesterId) throw new NotSkillOwnerError();

    // o ON DELETE CASCADE de user_skill remove os vínculos dos usuários
    await this.skillsRepository.delete({ id });
  }

  // ---------- auxiliares ----------

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }

  private toResponse(skill: Skill): SkillResponseDto {
    return plainToInstance(SkillResponseDto, skill, {
      excludeExtraneousValues: true,
    });
  }
}