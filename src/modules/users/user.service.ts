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

// campos que o PATCH pode alterar (birthDate é definido só no cadastro)
type UserChanges = Partial<
  Pick<User, 'username' | 'email' | 'seniority' | 'currentPosition' | 'password'>
>;

// lista explícita: um campo novo no DTO só chega ao banco se entrar aqui
const UPDATABLE_FIELDS = ['username', 'email', 'seniority', 'currentPosition'] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertEmailAvailable(dto.email);

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
    const user = await this.usersRepository.findOne({
      where: { id },
      select: { id: true, email: true },
    });
    if (!user) throw new UserNotFoundError();

    const changes: UserChanges = this.pickDefined(dto, UPDATABLE_FIELDS);

    // 3. e-mail novo não pode pertencer a outra conta (inclusive apagadas)
    if (changes.email !== undefined) {
      if (changes.email === user.email) {
        delete changes.email; // mesmo e-mail: não é alteração
      } else {
        await this.assertEmailAvailable(changes.email);
      }
    }

    // 4. senha nova exige a senha atual
    if (dto.password != null) {
      await this.assertCurrentPassword(id, dto.currentPassword);
      changes.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (Object.keys(changes).length === 0) throw new NoFieldsToUpdateError();

    try {
      await this.usersRepository.update(id, changes);
    } catch (error) {
      // duas requisições ao mesmo tempo com o mesmo e-mail: o banco barra a segunda
      if (this.isUniqueViolation(error)) throw new EmailAlreadyInUseError();
      throw error;
    }

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

  // withDeleted: o unique do e-mail também vale para contas apagadas (soft delete)
  private async assertEmailAvailable(email: string) {
    const taken = await this.usersRepository.exists({
      where: { email },
      withDeleted: true,
    });
    if (taken) throw new EmailAlreadyInUseError();
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

  // copia só os campos permitidos; os não enviados (undefined) não contam como alteração
  private pickDefined<T extends object, K extends keyof T>(
    obj: T,
    keys: readonly K[],
  ): Partial<Pick<T, K>> {
    const result: Partial<Pick<T, K>> = {};
    for (const key of keys) {
      if (obj[key] !== undefined) result[key] = obj[key];
    }
    return result;
  }

  private toResponse(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true, // só sai o que tem @Expose()
    });
  }
}