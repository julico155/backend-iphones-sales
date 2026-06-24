import { Controller, Post, Body, Headers, BadRequestException, Get, Param, ParseUUIDPipe, Patch, Delete } from '@nestjs/common';import { ProductsService } from './products.service';
import { GetTenantId } from '../../common/decorators/get-tenant.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    // Capturamos el header directamente usando el decorador oficial de NestJS
    @GetTenantId() tenantId: string,
    @Body() createProductDto: CreateProductDto
  ) {
    console.log('Tenant ID recibido en el header:', tenantId);
    // Validación de seguridad por si te olvidas de ponerlo en Postman
    if (!tenantId) {
      throw new BadRequestException('El header X-Tenant-ID es requerido para registrar productos.');
    }

    // Ya con el tenantId seguro y aislado, llamamos al servicio
    return this.productsService.create(tenantId, createProductDto);
  }

  @Get()
  findAll(@GetTenantId() tenantId: string) {
    return this.productsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string, // Validamos que el parámetro sea un UUID válido
  ) {
    return this.productsService.findOne(tenantId, id);
  }

  // Verbo PATCH /products/:id
  @Patch(':id')
  async update(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, updateProductDto);
  }

  // Verbo DELETE /products/:id
  @Delete(':id')
  async remove(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(tenantId, id);
  }

  
}