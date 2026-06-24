import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service'; // Ajusta la ruta si es necesario

@Global() // Lo hacemos global para que el JwtAuthGuard se pueda usar en cualquier lado sin re-importar el módulo
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ClaveSecretaSuperSegura123',
      signOptions: { expiresIn: '1d' }, // El token dura 1 día
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [JwtModule],
})
export class AuthModule {}