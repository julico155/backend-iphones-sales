import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto) {
    const { name, slug } = createTenantDto;

    // 1. Validar si el slug ya existe para otra tienda
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException(`El slug '${slug}' ya está siendo utilizado por otra tienda.`);
    }

    // 2. Crear el Tenant de forma limpia
    return await this.prisma.tenant.create({
      data: {
        name,
        slug,
      },
    });
  }

  // Opcional: Listar todos los tenants registrados
  async findAll() {
    return await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}