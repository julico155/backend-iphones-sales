import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus } from '@prisma/client';

export class SaleHistoryQueryDto {
  @IsOptional()
  @IsEnum(SaleStatus, { message: 'El estado debe ser ACTIVE o CANCELLED.' })
  status?: SaleStatus;

  @IsOptional()
  @IsDateString({}, { message: 'El campo from debe ser una fecha ISO válida (ej: 2024-01-01).' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'El campo to debe ser una fecha ISO válida (ej: 2024-12-31).' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
