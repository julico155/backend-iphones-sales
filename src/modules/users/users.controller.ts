import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminSaaSGuard } from '../auth/guards/admin-saas.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminSaaSGuard) // Solo el dueño del SaaS puede gestionar usuarios globalmente de momento
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return this.usersService.findAllGlobal();
  }
}