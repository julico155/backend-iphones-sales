import { IsEmail, IsEnum, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;

  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN o SELLER.' })
  @IsNotEmpty()
  role!: UserRole;

  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido.' })
  @IsNotEmpty()
  tenantId!: string;
}