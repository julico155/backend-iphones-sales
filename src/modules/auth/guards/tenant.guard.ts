import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Inyectado por el JwtAuthGuard
    
    // Extraemos el tenant que viene en el Header (en minúsculas o como esté configurado)
    const headerTenantId = request.headers['x-tenant-id'];

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }

    // 1. REGLA MAESTRA: Si eres el dueño del SaaS (Tenant Maestro), puedes operar en cualquier lado
    // Asumiendo que guardamos tu rol o validamos por el slug del tenant maestro
    if (user.email === 'julio@saas.com') {
      return true;
    }

    // 2. Si no viene el header, bloqueamos por seguridad en endpoints condomino
    if (!headerTenantId) {
      throw new ForbiddenException('Falta la cabecera X-Tenant-ID.');
    }

    // 3. CRUZAR DATOS: Validar que el Tenant del Token coincida con el del Header
    if (user.tenantId !== headerTenantId) {
      throw new ForbiddenException('Acceso denegado. No tienes permisos para operar en los datos de otra tienda.');
    }

    return true;
  }
}