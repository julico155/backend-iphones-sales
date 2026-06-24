import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ItemCondition } from '@prisma/client';

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsNumber({}, { message: 'La condición de la batería debe ser un número válido.' })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  batteryHealth?: number;

  @IsEnum(ItemCondition)
  @IsOptional()
  condition?: ItemCondition;

  @IsNumber({}, { message: 'El precio de costo debe ser un número válido.' })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  costPrice?: number;

  @IsNumber({}, { message: 'El precio de costo debe ser un número válido.' })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  salePrice?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  // Aquí el front mandará el array de URLs de las imágenes que NO quiere borrar
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    // Si viene como string (porque form-data a veces no parsea arrays), lo convertimos
    return typeof value === 'string' ? JSON.parse(value) : value;
  })
  existingImages?: string[];

  // Aquí el controlador inyectará la combinación final de fotos
  @IsOptional()
  images?: string[];
}