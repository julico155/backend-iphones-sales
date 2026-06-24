import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { CreatePublicDto } from './dto/create-public.dto';
import { UpdatePublicDto } from './dto/update-public.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tenants/lookup/:slug')
  async lookupBySlug(@Param('slug') slug: string) {
    const tenant = await this.publicService.findBySlug(slug);
    
    if (!tenant) {
      throw new NotFoundException(`La tienda con el subdominio '${slug}' no existe.`);
    }

    return {
      id: tenant.id,
      name: tenant.name,
    };
  }



  @Get('tenants/:slug/available-items')
  async getAvailableItems(@Param('slug') slug: string) {
    const items = await this.publicService.findAvailableItemsBySlug(slug);
    
    // Si prefieres lanzar un error cuando no hay tienda, puedes reusar tu validación, 
    // pero devolver el arreglo vacío si la tienda existe y no tiene stock es lo ideal.
    return items;
  }


}
