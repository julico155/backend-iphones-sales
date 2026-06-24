import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const GetTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // 1. Intentamos obtenerlo de donde lo deje el middleware o directamente del header
    // Nota: Los headers en Node.js siempre se convierten a minúsculas automáticamente
    const tenantId = request.tenantId || request.headers['x-tenant-id'];

    // 2. Si por algún motivo no viene en ningún lado, lanzamos una excepción limpia
    if (!tenantId) {
      throw new BadRequestException('El header X-Tenant-ID es requerido.');
    }

    return tenantId;
  },
);