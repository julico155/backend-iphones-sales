import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Si el endpoint no tiene el decorador @Roles, se permite el acceso libre
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Validamos si el usuario tiene el rol requerido (ej: ADMIN)
    const hasRole = requiredRoles.some((role) => user?.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos (ADMIN) para realizar esta acción.');
    }
    
    return true;
  }
}