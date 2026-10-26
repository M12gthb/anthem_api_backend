// src/modules/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './user.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // pública: é o cadastro
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query.page, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto, requester.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.usersService.remove(id, requester.id);
  }
}