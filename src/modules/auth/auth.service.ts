import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto'; // Puedes crear un DTO simple con email y password
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Buscar usuario en la base de datos
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales incorrectas o usuario inactivo.');
    }

    // 2. Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // 3. Generar el Payload del JWT incluyendo el tenantId y su rol
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      tenantId: user.tenantId 
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }




  async createFirstAdmin() {
    // 1. Creamos o buscamos el Tenant Maestro del Sistema (Landlord)
    const systemTenant = await this.prisma.tenant.upsert({
      where: { slug: 'system-admin' },
      update: {},
      create: {
        name: 'System Admin Global',
        slug: 'system-admin',
      },
    });

    // 2. Encriptamos tu contraseña master
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 3. Creamos tu usuario dueño del SaaS amarrado al Tenant del sistema
    const superAdmin = await this.prisma.user.upsert({
      where: { email: 'julio@saas.com' }, // Tu correo maestro
      update: {},
      create: {
        tenantId: systemTenant.id,
        name: 'Julio Alejandro',
        email: 'julio@saas.com',
        passwordHash: passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    return {
      message: '¡Entorno SaaS Global inicializado!',
      tenantMasterId: systemTenant.id,
      user: {
        email: superAdmin.email,
        role: superAdmin.role,
        tenantName: systemTenant.name,
      },
    };
  }



  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const { currentPassword, newPassword } = updatePasswordDto;

    // 1. Buscar al usuario logueado
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // 2. Verificar que la contraseña temporal/actual sea correcta
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    // 3. Encriptar la nueva contraseña elegida por el usuario
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 4. Actualizar la base de datos y cambiar la bandera a FALSE
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false, // <-- Ya cambió la contraseña, queda liberado
      },
    });

    return { message: 'Contraseña actualizada con éxito. Ya puedes usar el sistema de forma segura.' };
  }



  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        tenant: {
          select: { name: true, slug: true }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

}