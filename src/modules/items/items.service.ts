import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemQueryDto } from './dto/item-query.dto';
import { PLAN_LIMITS } from '../../common/constants/plan-limits';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: CreateItemDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const limits = PLAN_LIMITS[tenant!.plan];
    const activeItems = await this.prisma.item.count({
      where: { tenantId, status: 'AVAILABLE' },
    });

    if (activeItems >= limits.maxItems) {
      throw new ForbiddenException(
        `Tu plan ${tenant!.plan} permite máximo ${limits.maxItems} equipos activos en inventario. Contacta al administrador para actualizar tu plan.`,
      );
    }

    try {
      return await this.prisma.item.create({
        data: {
          tenantId,
          productId: data.productId,
          imei: data.imei,
          serialNumber: data.serialNumber,
          batteryHealth: data.batteryHealth,
          condition: data.condition || 'NEW',
          status: 'AVAILABLE',
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          notes: data.notes,
          images: data.images || [],
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('El número de IMEI ingresado ya existe en el sistema global.');
        }
      }
      throw error;
    }
  }

  async softDelete(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({ where: { id, tenantId } });

    if (!item) {
      throw new NotFoundException(`El equipo con ID '${id}' no existe en esta tienda.`);
    }

    await this.prisma.item.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: 'Equipo dado de baja del inventario correctamente.' };
  }

  async findAll(tenantId: string, query: ItemQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      status: status ?? { not: 'INACTIVE' as const },
    };

    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          product: { select: { model: true, storage: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInventorySummary(tenantId: string) {
    const grouped = await this.prisma.item.groupBy({
      by: ['productId', 'status'],
      where: { tenantId },
      _count: { _all: true },
    });

    const productIds = [...new Set(grouped.map(g => g.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, model: true, storage: true, color: true },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    const summary: Record<string, any> = {};
    for (const row of grouped) {
      if (!summary[row.productId]) {
        summary[row.productId] = {
          product: productMap.get(row.productId),
          available: 0,
          sold: 0,
          inactive: 0,
          total: 0,
        };
      }
      summary[row.productId][row.status.toLowerCase()] = row._count._all;
      summary[row.productId].total += row._count._all;
    }

    return Object.values(summary).sort((a: any, b: any) =>
      b.available - a.available,
    );
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException(`El equipo con ID '${id}' no existe en esta tienda.`);
    }

    return item;
  }

  async findByImeiOrSerial(tenantId: string, search: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        tenantId,
        status: 'AVAILABLE',
        OR: [{ imei: search }, { serialNumber: search }],
      },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Equipo no disponible para la venta o no registrado en esta tienda.');
    }

    return item;
  }

  async update(tenantId: string, id: string, data: UpdateItemDto) {
    const item = await this.prisma.item.findFirst({ where: { id, tenantId } });

    if (!item) {
      throw new NotFoundException(`El equipo con ID '${id}' no pertenece a tu tienda o no existe.`);
    }

    return await this.prisma.item.update({
      where: { id },
      data: {
        serialNumber: data.serialNumber,
        batteryHealth: data.batteryHealth,
        condition: data.condition,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        notes: data.notes,
        images: data.images,
      },
    });
  }
}
