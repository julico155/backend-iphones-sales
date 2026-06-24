import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación no encontrado.');
    }

    try {
      // Verificamos el token con la clave secreta
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'ClaveSecretaSuperSegura123',
      });
      
      // Inyectamos el usuario decodificado (id, email, role, tenantId) en el request
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}