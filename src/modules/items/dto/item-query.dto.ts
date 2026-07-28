import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemStatus } from '@prisma/client';

export class ItemQueryDto {
  @IsOptional()
  @IsEnum(ItemStatus, { message: 'El estado debe ser AVAILABLE, SOLD o INACTIVE.' })
  status?: ItemStatus;

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
