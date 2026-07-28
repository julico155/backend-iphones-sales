import { Controller, Post, Body, Get, UseGuards, Patch, Param, ParseUUIDPipe, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateTeamUserDto } from './dto/create-team-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminSaaSGuard } from '../auth/guards/admin-saas.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetTenantId } from '../../common/decorators/get-tenant.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Admin SaaS: gestión global ---

  @Post()
  @UseGuards(AdminSaaSGuard)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AdminSaaSGuard)
  async findAll() {
    return this.usersService.findAllGlobal();
  }

  // --- Tenant ADMIN: gestión de su equipo ---

  @Get('my-team')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findMyTeam(@GetTenantId() tenantId: string) {
    return this.usersService.findAllByTenant(tenantId);
  }

  @Post('my-team')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createTeamUser(
    @GetTenantId() tenantId: string,
    @Body() dto: CreateTeamUserDto,
  ) {
    return this.usersService.createForTenant(tenantId, dto);
  }

  @Patch('my-team/:id/toggle')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleUser(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.usersService.toggleActive(tenantId, id, req.user.sub);
  }
}
