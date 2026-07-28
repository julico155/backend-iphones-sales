import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleHistoryQueryDto } from './dto/sale-history-query.dto';
import { GetTenantId } from 'src/common/decorators/get-tenant.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard, TenantGuard) // <-- Primero verifica quién es, luego que su Tenant coincida con el Header
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @GetTenantId() tenantId: string,
    @Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(tenantId, createSaleDto);
  }

  // Endpoint 1: Historial de ventas filtrado automáticamente por la tienda actual
  @Get('history')
  async getSaleHistory(
    @GetTenantId() tenantId: string,
    @Query() query: SaleHistoryQueryDto,
  ) {
    return this.salesService.getHistoryByTenant(tenantId, query);
  }

  // Endpoint 2: Resumen del Dashboard (Total facturado y cantidad de iPhones vendidos)
  @Get('dashboard-summary')
  async getDashboardSummary(@GetTenantId() tenantId: string) {
    return this.salesService.getDashboardSummary(tenantId);
  }


  @Get(':id')
  async findOne(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOne(tenantId, id);
  }

  
  @Patch(':id/cancel')
  async cancel(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.cancel(tenantId, id);
  }

  // @Get()
  // findAll() {
  //   return this.salesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.salesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
  //   return this.salesService.update(+id, updateSaleDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.salesService.remove(+id);
  // }
}
