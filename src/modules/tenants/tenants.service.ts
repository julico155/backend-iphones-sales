import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

  async findAll() {
    return await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleActive(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(`El tenant con ID '${id}' no existe.`);
    }

    if (tenant.slug === 'system-admin') {
      throw new ConflictException('No se puede desactivar el tenant del sistema.');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    return {
      message: `Tienda ${updated.isActive ? 'activada' : 'desactivada'} correctamente.`,
      tenant: updated,
    };
  }
}