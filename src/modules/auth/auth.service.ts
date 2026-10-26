// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { InvalidCredentialsError } from './erros/erros/invalid-credentials.error.js';

// hash descartável, usado quando o e-mail não existe (mesmo custo do hash real)
const DUMMY_HASH = bcrypt.hashSync('senha-falsa', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(email);

    // compara sempre, para o tempo de resposta ser parecido nos dois casos
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    // mesma resposta para e-mail inexistente e senha errada
    if (!user || !valid) throw new InvalidCredentialsError();

    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return { accessToken };
  }
}