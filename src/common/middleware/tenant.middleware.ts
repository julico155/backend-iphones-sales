import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extendemos la interfaz de Express para poder tipar req.tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // NOTA: Para desarrollo inicial podemos leerlo de un header 'x-tenant-id'.
    // Más adelante, cuando tengamos JWT, lo extraeremos del token de autenticación.
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId && req.path !== '/auth/login' && req.path !== '/tenants') {
      throw new BadRequestException('El header X-Tenant-ID es requerido para esta operación.');
    }

    // Inyectamos el ID en la petición para que esté disponible en controladores y servicios
    req.tenantId = tenantId;
    next();
  }
}