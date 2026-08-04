import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

const makeContext = (user: any, headers: Record<string, string> = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user, headers }),
    }),
  }) as unknown as ExecutionContext;

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('returns true when user tenantId matches header', () => {
    const ctx = makeContext(
      { tenantId: 'tenant-uuid' },
      { 'x-tenant-id': 'tenant-uuid' },
    );

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when user is not in request', () => {
    const ctx = makeContext(null, { 'x-tenant-id': 'tenant-uuid' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when X-Tenant-ID header is missing', () => {
    const ctx = makeContext({ tenantId: 'tenant-uuid' }, {});

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when tenantId does not match header', () => {
    const ctx = makeContext(
      { tenantId: 'my-tenant' },
      { 'x-tenant-id': 'other-tenant' },
    );

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
