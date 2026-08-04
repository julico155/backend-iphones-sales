import { Injectable } from '@nestjs/common';
import { CreatePublicDto } from './dto/create-public.dto';
import { UpdatePublicDto } from './dto/update-public.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PublicService {

  constructor(private readonly prisma: PrismaService) {}
  

  create(createPublicDto: CreatePublicDto) {
    return 'This action adds a new public';
  }

  findAll() {
    return `This action returns all public`;
  }

  findOne(id: number) {
    return `This action returns a #${id} public`;
  }

  update(id: number, updatePublicDto: UpdatePublicDto) {
    return `This action updates a #${id} public`;
  }

  remove(id: number) {
    return `This action removes a #${id} public`;
  }


  async findBySlug(slug: string) {
    return await this.prisma.tenant.findFirst({
      where: {
        // Ajusta el nombre del campo según cómo lo tengas en tu schema.prisma
        // Por ejemplo, si tu columna se llama 'slug' o 'subdomain'
        slug: slug.toLowerCase().trim(), 
      },
    });
  }

  async findAvailableItemsBySlug(slug: string) {
    // 1. Primero verificamos si el tenant existe por su slug
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: slug.toLowerCase().trim() },
    });

    if (!tenant) {
      return []; // Si no existe el tenant, devolvemos un arreglo vacío
    }

    // 2. Buscamos los ítems físicos de ese Tenant que estén disponibles
    return await this.prisma.item.findMany({
      where: {
        tenantId: tenant.id,
        status: 'AVAILABLE', // 🍏 Solo lo que esté listo para vender
        // Si manejas un borrado lógico en ítems como isActive, lo pones aquí:
        // isActive: true 
      },
      select: {
      id: true,
      batteryHealth: true,
      condition: true,
      status: true,
      salePrice: true, // 🍏 Enviamos solo el precio de venta
      notes: true,
      images: true,
      createdAt: true,
      product: true,   // 📦 Trae todo el objeto product asociado
      },
      orderBy: {
        createdAt: 'desc', // Los últimos en llegar aparecerán primero en la vitrina
      },
    });
  }

  
}
