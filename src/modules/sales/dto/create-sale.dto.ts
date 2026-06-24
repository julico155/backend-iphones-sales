import { IsString, IsArray, IsNumber, IsNotEmpty, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

class SaleDetailDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsNotEmpty()
  priceSold!: number;
}

export class CreateSaleDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string; // Nuevo: Teléfono del cliente
  
  @IsEnum(PaymentMethod, { message: 'El método de pago debe ser CASH, TRANSFER, QR o CARD.' })
  @IsNotEmpty({ message: 'El método de pago es requerido.' })
  paymentMethod!: PaymentMethod; // Nuevo: Obligatorio en la venta

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleDetailDto)
  items!: SaleDetailDto[];
}