import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { UsersService } from '../../modules/users/user.service.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../types/access-token-payload.js';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (!isUUID(payload.sub) || typeof payload.tv !== 'number') {
      throw new UnauthorizedException();
    }

    // conta removida (soft delete) ou senha trocada depois da emissão do token
    const state = await this.usersService.findAuthStateById(payload.sub);
    if (!state || state.tokenVersion !== payload.tv) {
      throw new UnauthorizedException();
    }

    request.user = { id: payload.sub };
    return true;
  }
}