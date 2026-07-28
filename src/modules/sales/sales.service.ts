import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleHistoryQueryDto } from './dto/sale-history-query.dto';
import { ItemStatus, PaymentMethod, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, createSaleDto: CreateSaleDto) {
    const { customerName, customerPhone, paymentMethod, items } = createSaleDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un ítem para procesar la venta.');
    }

    const itemIds = items.map(i => i.itemId);

    // Ejecutamos la venta de forma transaccional y atómica
    return await this.prisma.client.$transaction(async (tx) => {
      
      // 1. Validar la existencia de los equipos físicos para este Tenant
      const dbItems = await tx.item.findMany({
        where: {
          id: { in: itemIds },
          tenantId: tenantId,
        },
      });

      if (dbItems.length !== items.length) {
        throw new NotFoundException('Uno o más equipos no corresponden al inventario de esta tienda.');
      }

      // 2. Verificar que todos los equipos estén realmente AVAILABLE
      const unavailableItem = dbItems.find(item => item.status !== ItemStatus.AVAILABLE);
      if (unavailableItem) {
        throw new BadRequestException(`El equipo con IMEI ${unavailableItem.imei} no está disponible para la venta (Estado: ${unavailableItem.status}).`);
      }

      // 3. Calcular el monto total sumando los precios de venta
      const totalAmount = items.reduce((sum, current) => sum + current.priceSold, 0);

      // 4. Crear la cabecera de la venta mapeando exactamente tus campos
      const sale = await tx.sale.create({
        data: {
          tenantId: tenantId,
          userId: userId,
          clientName: customerName || 'Cliente Mostrador',
          clientPhone: customerPhone || null,
          paymentMethod: paymentMethod,
          totalAmount: totalAmount,
        },
      });

      // 5. Insertar desgloses y pasar el inventario a SOLD
      for (const itemDto of items) {
        // Guardamos el detalle
        await tx.saleDetail.create({
          data: {
            saleId: sale.id,
            itemId: itemDto.itemId,
            priceSold: itemDto.priceSold,
          },
        });

        // Actualizamos el estado del iPhone físico de forma nativa usando tu ENUM
        await tx.item.update({
          where: { id: itemDto.itemId },
          data: { 
            status: ItemStatus.SOLD 
          },
        });
      }

      // 6. Retornar la venta armada con sus relaciones tal cual lo estructuraste
      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          saleDetails: {
            include: {
              item: {
                include: {
                  product: true // Te incluye también el modelo, color y capacidad del iPhone vendido
                }
              }
            }
          }
        }
      });
    });
  }




  async getHistoryByTenant(tenantId: string, query: SaleHistoryQueryDto) {
    const { status, userId, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status && { status }),
      ...(userId && { userId }),
      ...(from || to ? {
        saleDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to + 'T23:59:59.999Z') }),
        },
      } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          saleDetails: {
            include: { item: { include: { product: true } } },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardSummary(tenantId: string) {
    const saleWhere = { tenantId, status: SaleStatus.ACTIVE };

    const [aggregations, saleDetails, totalItemsSold, availableItemsCount] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.saleDetail.findMany({
        where: { sale: saleWhere },
        include: { item: { select: { costPrice: true } } },
      }),
      this.prisma.saleDetail.count({ where: { sale: saleWhere } }),
      this.prisma.item.count({ where: { tenantId, status: 'AVAILABLE' } }),
    ]);

    const totalRevenue = Number(aggregations._sum.totalAmount ?? 0);
    const totalCost = saleDetails.reduce((sum, d) => sum + Number(d.item.costPrice ?? 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const profitMarginPercent = totalRevenue > 0
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    return {
      totalRevenue,
      totalSalesCount: aggregations._count.id ?? 0,
      totalItemsSold,
      availableItemsCount,
      totalCost,
      grossProfit,
      profitMarginPercent,
    };
  }


  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        tenantId, // 🛡️ Bloqueo estricto por tienda
      },
      include: {
        user: true,      // Trae nombre, NIT/CI del cliente
        saleDetails: {       // Trae las líneas del carrito de compra
          include: {
            item: {          // Trae el equipo físico específico
              include: {
                product: true, // Trae el modelo base (ej: iPhone 15 Pro Max 256GB)
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID '${id}' no existe en esta tienda.`);
    }

    return sale;
  }


  async cancel(tenantId: string, id: string) {
    // 1. Buscar la venta con sus detalles para saber qué ítems (iPhones) se vendieron
    const sale = await this.prisma.sale.findFirst({
      where: { 
        id, 
        tenantId // 🛡️ Validación estricta multi-tenant
      },
      include: { 
        saleDetails: true 
      },
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID '${id}' no existe en esta tienda.`);
    }

    // Supongamos que manejas un campo o estado. Si no tienes un ENUM, puedes usar strings planos o agregar un campo si fuera necesario.
    // Si tu esquema no tiene la columna 'status', la agregaremos conceptualmente o usamos lo que tengas mapeado. 
    // Asumiendo que agregaste el estado en tu ENUM o string:
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Esta venta ya se encuentra anulada.');
    }

    // 2. Transacción atómica en la Base de Datos
    return await this.prisma.client.$transaction(async (tx) => {
      
      // A. Actualizar el estado de la venta a CANCELLED (Anulada)
      // Nota: Si no tienes el campo status en tu modelo físico todavía, recuerda agregarlo como string o enum.
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { status: SaleStatus.CANCELLED },
      });

      // B. Extraer todos los IDs de los ítems (los dispositivos físicos) de los detalles
      const itemIds = sale.saleDetails.map(detail => detail.itemId);

      // C. Devolver los equipos al inventario: cambiar su estado a 'AVAILABLE'
      if (itemIds.length > 0) {
        await tx.item.updateMany({
          where: {
            id: { in: itemIds },
            tenantId,
          },
          data: { 
            status: 'AVAILABLE' 
          },
        });
      }

      return {
        message: 'Venta anulada correctamente. Los equipos asociados vuelven a estar disponibles en el inventario.',
        saleId: updatedSale.id
      };
    });
  }


}