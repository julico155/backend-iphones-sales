import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminSaaSGuard } from './admin-saas.guard';

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
};

const makeContext = (user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('AdminSaaSGuard', () => {
  let guard: AdminSaaSGuard;

  beforeEach(() => {
    guard = new AdminSaaSGuard(mockPrisma as any);
    jest.clearAllMocks();
  });

  it('allows access for ADMIN user on system-admin tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'system-admin' });
    const ctx = makeContext({ role: 'ADMIN', tenantId: 'system-tenant-uuid' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws UnauthorizedException when user is not authenticated', async () => {
    const ctx = makeContext(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when user role is SELLER', async () => {
    const ctx = makeContext({ role: 'SELLER', tenantId: 'tenant-uuid' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when tenant is not system-admin', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'regular-store' });
    const ctx = makeContext({ role: 'ADMIN', tenantId: 'tenant-uuid' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when tenant not found', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ role: 'ADMIN', tenantId: 'tenant-uuid' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
