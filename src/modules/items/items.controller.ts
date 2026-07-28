import { Controller, Post, Get, Patch, Delete, Body, UseInterceptors, UploadedFiles, Param, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetTenantId } from '../../common/decorators/get-tenant.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage, Multer } from 'multer';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemQueryDto } from './dto/item-query.dto';
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
    @Body() createItemDto: CreateItemDto,
    @UploadedFiles() files: Multer.File[],
  ) {
    createItemDto.images = files?.map(file => `${process.env.APP_URL ?? 'http://localhost:3000'}/uploads/${file.filename}`) || [];
    return this.itemsService.create(tenantId, createItemDto);
  }

  @Get()
  findAll(@GetTenantId() tenantId: string, @Query() query: ItemQueryDto) {
    return this.itemsService.findAll(tenantId, query);
  }

  @Get('summary')
  getInventorySummary(@GetTenantId() tenantId: string) {
    return this.itemsService.getInventorySummary(tenantId);
  }

  @Get('search/:term')
  async searchItem(@GetTenantId() tenantId: string, @Param('term') term: string) {
    return this.itemsService.findByImeiOrSerial(tenantId, term);
  }

  @Get(':id')
  async findOne(@GetTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Delete(':id')
  async remove(@GetTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.softDelete(tenantId, id);
  }

  @Patch(':id')
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
  async update(
    @GetTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateItemDto: UpdateItemDto,
    @UploadedFiles() files: Multer.File[],
  ) {
    const newImageUrls = files?.map(file => `${process.env.APP_URL ?? 'http://localhost:3000'}/uploads/${file.filename}`) || [];
    const keepImages = updateItemDto.existingImages || [];
    updateItemDto.images = [...keepImages, ...newImageUrls];
    return this.itemsService.update(tenantId, id, updateItemDto);
  }
}
