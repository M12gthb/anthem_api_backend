// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { User } from './entities/user.entity.js';
import { CannotModifyOtherUserError } from './erros/cannot-modify-other-user.error.js';
import { EmailAlreadyInUseError } from './erros/email-already-in-use.error.js';
import { InvalidBirthDateError } from './erros/invalid-birth-date.error.js';
import { InvalidCurrentPasswordError } from './erros/invalid-current-password.error.js';
import { NoFieldsToUpdateError } from './erros/no-fields-to-update.error.js';
import { UserNotFoundError } from './erros/user-not-found.error.js';

const SALT_ROUNDS = 10;

type UserChanges = Partial<
  Pick<User, 'username' | 'seniority' | 'currentPosition' | 'birthDate' | 'password'>
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // withDeleted: o unique do e-mail também vale para contas apagadas (soft delete)
    const emailTaken = await this.usersRepository.exists({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (emailTaken) throw new EmailAlreadyInUseError();

    if (dto.birthDate) this.assertBirthDateNotInFuture(dto.birthDate);

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({ ...dto, password });

    try {
      const saved = await this.usersRepository.save(user);
      return this.toResponse(saved);
    } catch (error) {
      // duas requisições iguais ao mesmo tempo: o banco barra a segunda
      if (this.isUniqueViolation(error)) throw new EmailAlreadyInUseError();
      throw error;
    }
  }

  async findAll(page: number, limit: number) {
    const [users, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users.map((user) => this.toResponse(user)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new UserNotFoundError();

    return this.toResponse(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
  ): Promise<UserResponseDto> {
    // 1. só o dono da conta (checa antes de consultar o banco,
    //    para não revelar quais ids existem)
    this.assertIsOwner(id, requesterId);

    // 2. a conta precisa existir (soft-deleted conta como inexistente)
    if (!(await this.usersRepository.existsBy({ id }))) {
      throw new UserNotFoundError();
    }

    const { password, currentPassword, ...profile } = dto;
    const changes: UserChanges = this.withoutUndefined(profile);

    if (changes.birthDate) this.assertBirthDateNotInFuture(changes.birthDate);

    // 3. senha nova exige a senha atual
    if (password != null) {
      await this.assertCurrentPassword(id, currentPassword);
      changes.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (Object.keys(changes).length === 0) throw new NoFieldsToUpdateError();

    await this.usersRepository.update(id, changes);
    return this.findOne(id);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    this.assertIsOwner(id, requesterId);

    if (!(await this.usersRepository.existsBy({ id }))) {
      throw new UserNotFoundError();
    }

    await this.usersRepository.softDelete({ id });
  }

  // usado pelo módulo de autenticação (a coluna password tem select: false)
  findByEmailWithPassword(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      select: { id: true, password: true },
    });
  }

  // ---------- auxiliares ----------

  private assertIsOwner(targetId: string, requesterId: string) {
    if (targetId !== requesterId) throw new CannotModifyOtherUserError();
  }

  private assertBirthDateNotInFuture(birthDate: string) {
    if (new Date(`${birthDate}T00:00:00`) > new Date()) {
      throw new InvalidBirthDateError();
    }
  }

  private async assertCurrentPassword(id: string, currentPassword?: string) {
    const current = await this.usersRepository.findOne({
      where: { id },
      select: { id: true, password: true },
    });

    const valid =
      current && currentPassword
        ? await bcrypt.compare(currentPassword, current.password)
        : false;

    if (!valid) throw new InvalidCurrentPasswordError();
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }

  // campos não enviados ficam como undefined no DTO e não podem contar como alteração
  private withoutUndefined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private toResponse(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true, // só sai o que tem @Expose()
    });
  }
}