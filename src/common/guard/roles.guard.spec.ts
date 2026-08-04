import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

const makeContext = (user: any): ExecutionContext =>
  ({
    getHandler:  () => ({}),
    getClass:    () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('returns true when no roles are required on endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ role: UserRole.SELLER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ role: UserRole.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ role: UserRole.SELLER });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns true when user role matches any of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.SELLER]);
    const ctx = makeContext({ role: UserRole.SELLER });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
