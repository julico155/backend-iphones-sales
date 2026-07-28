import { Controller, Post, Body, Get, Patch, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @Patch(':id/plan')
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantPlanDto,
  ) {
    return this.tenantsService.updatePlan(id, dto);
  }

  @Patch(':id/toggle')
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.toggleActive(id);
  }
}