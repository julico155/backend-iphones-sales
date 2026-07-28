import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return true;

    const user = context.switchToHttp().getRequest().user;

    if (!user) return true;

    if (user.mustChangePassword) {
      throw new ForbiddenException(
        'Debes cambiar tu contraseña antes de continuar. Usa POST /auth/update-password.',
      );
    }

    return true;
  }
}
