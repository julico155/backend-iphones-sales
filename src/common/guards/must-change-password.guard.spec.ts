import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';

const makeContext = (user: any, skipMeta = false): ExecutionContext => {
  const mockHandler = {};
  const mockClass   = {};

  return {
    getHandler:  () => mockHandler,
    getClass:    () => mockClass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    _skipMeta: skipMeta,
  } as unknown as ExecutionContext;
};

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new MustChangePasswordGuard(reflector);
  });

  it('returns true when SkipPasswordCheck decorator is present', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = makeContext({ mustChangePassword: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = makeContext(null);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when mustChangePassword is true', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = makeContext({ mustChangePassword: true });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns true when mustChangePassword is false', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = makeContext({ mustChangePassword: false });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('error message includes the update-password endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = makeContext({ mustChangePassword: true });

    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      expect(e.message).toContain('/auth/update-password');
    }
  });
});
