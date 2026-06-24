import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Crear un nuevo modelo de iPhone en el catálogo de la tienda
  async create(tenantId: string, data: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          model: data.model,
          storage: data.storage,
          color: data.color,
          suggestedPrice: data.suggestedPrice,
          tenantId: tenantId, // <-- Asegúrate de que esta línea esté asignando la variable que recibe la función
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Este modelo con la misma capacidad y color ya está registrado en tu catálogo.');
        }
      }
      throw error;
    }
  }

  // Listar solo los productos que pertenecen al Tenant actual
  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true }, 
      orderBy: { model: 'asc' },
    });
  }



  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId, // Evita que si meten un ID válido de otro tenant puedan verlo
      },
      include: {
        items: true, // Opcional: incluye los iPhones físicos asociados a este modelo
      },
    });

    if (!product) {
      throw new NotFoundException(`El producto con ID '${id}' no existe en esta tienda.`);
    }

    return product;
  }

  // 2. EDITAR / ACTUALIZAR
  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto) {
    // Primero verificamos que el producto exista y pertenezca al tenant
    await this.findOne(tenantId, id);

    // Si están intentando actualizar el nombre, podríamos validar duplicados opcionalmente
    return await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  
  async remove(tenantId: string, id: string) {
  // 1. Verificamos que el producto exista en este tenant
  const product = await this.findOne(tenantId, id);

  // 2. En lugar de borrar, hacemos un update del estado
  await this.prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return { message: `El producto '${product.model}' ha sido inactivado correctamente.` };
}

}