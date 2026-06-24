import { IsNotEmpty, IsString, IsOptional, IsNumber, IsUUID, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ItemCondition } from '@prisma/client'; // Tu ENUM de Prisma (NEW, USED, etc.)

export class CreateItemDto {
  @IsUUID('4', { message: 'El productId debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El productId es requerido.' })
  productId!: string;

  @IsString()
  @IsNotEmpty({ message: 'El IMEI es obligatorio.' })
  imei!: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsNumber({}, { message: 'La condición de la batería debe ser un número válido.' })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined) // Convierte string a número de forma segura
  batteryHealth?: number;

  @IsEnum(ItemCondition, { message: 'La condición debe ser un estado válido del ENUM (ej: NEW, USED).' })
  @IsOptional()
  condition?: ItemCondition;

  @IsNumber({}, { message: 'El precio de costo debe ser un número válido.' })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined) // Convierte string a número de forma segura
  costPrice?: number;

  @IsNumber({}, { message: 'El precio de costo debe ser un número válido.' })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined) // Convierte string a número de forma segura
  salePrice?: number;



  @IsString()
  @IsOptional()
  notes?: string;

  // Este campo no viene del cliente, lo inyectamos en el controlador tras procesar Multer
  @IsOptional()
  images?: string[];
}