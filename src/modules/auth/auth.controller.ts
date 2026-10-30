import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppThrottlerGuard } from '../../common/guards/app-throttler.guard.js';
import {
  loginRateLimit,
  loginRateTtlMs,
} from '../../common/throttler/login-throttle.js';
import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  clearCookieOptions,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from './refresh-cookie.js';

const readRefreshCookie = (req: Request): string | undefined =>
  (req as Request & { cookies?: Record<string, string> }).cookies?.[
    REFRESH_COOKIE
  ];

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AppThrottlerGuard)
  @Throttle({ default: { limit: loginRateLimit, ttl: loginRateTtlMs } })
  @ApiOperation({
    summary:
      'Autentica o usuário: devolve o token de acesso e define o cookie do refresh token',
  })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'Token de acesso de curta duração; o refresh token vai no cookie HttpOnly',
  })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas de login (5 por minuto por IP e e-mail)',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Troca o refresh token (cookie) por um novo par de tokens',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token ausente, inválido, expirado ou revogado',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken } = await this.authService.refresh(
      readRefreshCookie(req),
    );
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerra a sessão deste dispositivo' })
  @ApiNoContentResponse({
    description: 'Refresh token revogado e cookie apagado (também sem cookie)',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  }
}