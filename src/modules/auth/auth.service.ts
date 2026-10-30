// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import type { AccessTokenPayload } from '../../common/types/access-token-payload.js';
import { UsersService } from '../users/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { InvalidCredentialsError } from './erros/erros/invalid-credentials.error.js';
import { InvalidRefreshTokenError } from './erros/erros/invalid-refresh-token.error.js';
import { refreshTtlMs } from './refresh-cookie.js';

const DUMMY_HASH = bcrypt.hashSync('senha-falsa', 10);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async login({ email, password }: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(email);

    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !valid) throw new InvalidCredentialsError();

    return this.issueTokens(user.id, user.tokenVersion, randomUUID());
  }

  async refresh(rawToken: string | undefined): Promise<AuthTokens> {
    if (!rawToken) throw new InvalidRefreshTokenError();

    const stored = await this.refreshTokens.findOneBy({
      tokenHash: this.hash(rawToken),
    });
    if (!stored) throw new InvalidRefreshTokenError();

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new InvalidRefreshTokenError();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.usersService.findAuthStateById(stored.userId);
    if (!user || user.tokenVersion !== stored.tokenVersion) {
      await this.revokeFamily(stored.familyId);
      throw new InvalidRefreshTokenError();
    }

    const revoked = await this.refreshTokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!revoked.affected) {
      await this.revokeFamily(stored.familyId);
      throw new InvalidRefreshTokenError();
    }

    return this.issueTokens(user.id, user.tokenVersion, stored.familyId);
  }


  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;

    await this.refreshTokens.update(
      { tokenHash: this.hash(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueTokens(
    userId: string,
    tokenVersion: number,
    familyId: string,
  ): Promise<AuthTokens> {
    const payload: AccessTokenPayload = { sub: userId, tv: tokenVersion };
    const accessToken = await this.jwtService.signAsync(payload);


    const refreshToken = randomBytes(48).toString('base64url');
    await this.refreshTokens.insert({
      userId,
      tokenHash: this.hash(refreshToken),
      familyId,
      tokenVersion,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    });

    return { accessToken, refreshToken };
  }

  private revokeFamily(familyId: string) {
    return this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}