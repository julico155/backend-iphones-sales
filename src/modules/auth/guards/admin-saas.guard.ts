import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AdminSaaSGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Inyectado previamente por el JwtAuthGuard

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado en el contexto.');
    }

    // 1. Validar que tenga el rol ADMIN
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permisos administrativos.');
    }

    // 2. Validar que su Tenant sea el del Sistema (Landlord)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant || tenant.slug !== 'system-admin') {
      throw new ForbiddenException('Acceso denegado. Solo el dueño del SaaS puede realizar esta acción.');
    }

    return true;
  }
}