import { Controller, Post, Body, Get , UseGuards} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Tu guardia JWT
import { RolesGuard } from '../../common/guard/roles.guard'; // Tu guardia de roles
import { AdminSaaSGuard } from '../auth/guards/admin-saas.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard, AdminSaaSGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  async findAll() {
    return this.tenantsService.findAll();
  }
}