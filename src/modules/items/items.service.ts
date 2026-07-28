import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PLAN_LIMITS } from '../../common/constants/plan-limits';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: CreateItemDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const limits = PLAN_LIMITS[tenant!.plan];
    const activeItems = await this.prisma.item.count({
      where: { tenantId, status: { in: ['AVAILABLE', 'RESERVED'] } },
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
          images: data.images || [], // Almacena el array de URLs
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

  // Obtener todo el stock de esta tienda, incluyendo los detalles del modelo
  async findAll(tenantId: string) {
    return this.prisma.item.findMany({
      where: {
        tenantId,
        status: { not: 'INACTIVE' },
      },
      include: {
        product: {
          select: {
            model: true,
            storage: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }


  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId },
      include: { product: true }, // Incluye los datos del modelo base (ej: nombre, marca)
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
        status: 'AVAILABLE', // Solo nos interesan los que se pueden vender
        OR: [
          { imei: search },
          { serialNumber: search }
        ]
      },
      include: { product: true }
    });

    if (!item) {
      throw new NotFoundException('Equipo no disponible para la venta o no registrado en esta tienda.');
    }

    return item;
  }


  async update(tenantId: string, id: string, data: UpdateItemDto) {
    // 1. Validar existencia y pertenencia al Tenant
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`El equipo con ID '${id}' no pertenece a tu tienda o no existe.`);
    }

    // 2. Actualizar en la base de datos
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