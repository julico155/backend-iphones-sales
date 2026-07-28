import { TenantPlan } from '@prisma/client';

export const PLAN_LIMITS: Record<TenantPlan, { maxUsers: number; maxItems: number }> = {
  BASIC: { maxUsers: 2,  maxItems: 20  },
  PRO:   { maxUsers: 5,  maxItems: 50  },
  MAX:   { maxUsers: 10, maxItems: 100 },
};
