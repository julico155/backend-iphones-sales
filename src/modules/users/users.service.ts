import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateTeamUserDto } from './dto/create-team-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, role, tenantId } = createUserDto;

    const tenantExists = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenantExists) {
      throw new NotFoundException(`El Tenant con ID '${tenantId}' no existe.`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`El correo electrónico '${email}' ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { name, email, passwordHash, role, tenantId },
    });

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

  async findAllGlobal() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenant: { select: { name: true, slug: true } },
        mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForTenant(tenantId: string, dto: CreateTeamUserDto) {
    const { name, email, password, role } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`El correo '${email}' ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { name, email, passwordHash, role, tenantId, mustChangePassword: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async toggleActive(tenantId: string, userId: string, requestingUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`El usuario con ID '${userId}' no existe en esta tienda.`);
    }

    if (userId === requestingUserId) {
      throw new BadRequestException('No puedes desactivar tu propio usuario.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return {
      message: `Usuario ${updated.isActive ? 'activado' : 'desactivado'} correctamente.`,
      user: updated,
    };
  }
}
