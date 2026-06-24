import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Esto hace que Prisma esté disponible en toda la app sin importarlo en cada módulo
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Esto permite que otros servicios lo inyecten
})
export class PrismaModule {}