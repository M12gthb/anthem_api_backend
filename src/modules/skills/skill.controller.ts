import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { SkillResponseDto } from './dto/skill-response.dto.js';
import { SkillsPageResponseDto } from './dto/skills-page-response.dto.js';
import { SkillsService } from './skill.service.js';
@ApiTags('Habilidades')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as habilidades (paginado, em ordem alfabética)' })
  @ApiOkResponse({ type: SkillsPageResponseDto })
  @ApiBadRequestResponse({ description: 'page ou limit inválidos' })
  findAll(@Query() { page, limit }: PaginationQueryDto) {
    return this.skillsService.findAll(page, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lista as habilidades de um usuário' })
  @ApiOkResponse({
    type: [SkillResponseDto],
    description: 'Lista vazia se o usuário não tem habilidades',
  })
  @ApiBadRequestResponse({ description: 'O userId não é um UUID válido' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.skillsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma habilidade pelo id' })
  @ApiOkResponse({ type: SkillResponseDto })
  @ApiBadRequestResponse({ description: 'O id não é um UUID válido' })
  @ApiNotFoundResponse({ description: 'Habilidade não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Cria uma habilidade',
    description: 'Quem cria passa a ser o dono, e só o dono pode removê-la.',
  })
  @ApiCreatedResponse({ type: SkillResponseDto })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
  @ApiConflictResponse({ description: 'A habilidade já existe' })
  create(@CurrentUser() requester: AuthUser, @Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto, requester.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove uma habilidade',
    description:
      'Só o dono pode remover. O vínculo da habilidade com os usuários também é removido.',
  })
  @ApiNoContentResponse({ description: 'Habilidade removida' })
  @ApiBadRequestResponse({ description: 'O id não é um UUID válido' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
  @ApiForbiddenResponse({ description: 'O token é de outro usuário (não é o dono)' })
  @ApiNotFoundResponse({ description: 'Habilidade não encontrada' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.skillsService.remove(id, requester.id);
  }
}