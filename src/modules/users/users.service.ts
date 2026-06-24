import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, role, tenantId } = createUserDto;

    // 1. Verificar si el Tenant realmente existe
    const tenantExists = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenantExists) {
      throw new NotFoundException(`El Tenant con ID '${tenantId}' no existe.`);
    }

    // 2. Verificar si el email ya está registrado
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`El correo electrónico '${email}' ya está registrado.`);
    }

    // 3. Encriptar la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Crear el usuario
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        tenantId,
      },
    });

    // Retornamos el objeto sin el passwordHash por seguridad
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // Listar todos los usuarios del sistema (Acceso para el dueño del SaaS)
  async findAllGlobal() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenant: {
          select: { name: true, slug: true },
        },
        mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Listar usuarios filtrados por un Tenant específico (Acceso para el ADMIN de una tienda)
  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}