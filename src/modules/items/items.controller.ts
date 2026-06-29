import { Controller, Post, Get, Patch, Body, UseInterceptors, UploadedFiles, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetTenantId } from '../../common/decorators/get-tenant.decorator';
import { ItemCondition } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage, Multer } from 'multer';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('items')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('photos', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `imei-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async create(
    @GetTenantId() tenantId: string,
    @Body() createItemDto: CreateItemDto, // <-- Usamos el DTO aquí
    @UploadedFiles() files: Multer.File[],
  ) {
    // Mapeamos las fotos locales e inyectamos directamente al DTO
    createItemDto.images = files?.map(file => `${process.env.APP_URL ?? 'http://localhost:3000'}/uploads/${file.filename}`) || [];

    return this.itemsService.create(tenantId, createItemDto);
  }

  
  @Get()
  findAll(@GetTenantId() tenantId: string) {
    return this.itemsService.findAll(tenantId);
  }


  @Get(':id')
  async findOne(@GetTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Get('search/:term')
  async searchItem(@GetTenantId() tenantId: string, @Param('term') term: string) {
    return this.itemsService.findByImeiOrSerial(tenantId, term);
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('photos', 5, { // Permite subir hasta 5 fotos nuevas para actualizar
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `imei-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async update(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateItemDto: UpdateItemDto,
    @UploadedFiles() files: Multer.File[],
  ) {
    // 1. Mapeamos las URLs de las fotos NUEVAS que se acaban de subir
    const newImageUrls = files?.map(file => `${process.env.APP_URL ?? 'http://localhost:3000'}/uploads/${file.filename}`) || [];

    // 2. Recuperamos las imágenes que el usuario decidió conservar del pasado
    const keepImages = updateItemDto.existingImages || [];

    // 3. La lista final de imágenes de este ítem es la suma de ambos mundos
    updateItemDto.images = [...keepImages, ...newImageUrls];

    return this.itemsService.update(tenantId, id, updateItemDto);
  }
  
  
}