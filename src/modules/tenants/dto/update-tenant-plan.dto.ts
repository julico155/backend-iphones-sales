import { IsEnum, IsNotEmpty } from 'class-validator';
import { TenantPlan } from '@prisma/client';

export class UpdateTenantPlanDto {
  @IsEnum(TenantPlan, { message: 'El plan debe ser BASIC, PRO o MAX.' })
  @IsNotEmpty()
  plan!: TenantPlan;
}
