import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from '../../src/middleware/roles.guard';
import { UserRole } from '../../src/config/constants';

function mockContext(role: string | null, handlerRoles: UserRole[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(handlerRoles);

  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { id: 'user-1', role } : null,
      }),
    }),
  } as any;

  return { guard, ctx };
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const { guard, ctx } = mockContext(UserRole.CUSTOMER, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows admin to access admin-only route', () => {
    const { guard, ctx } = mockContext(UserRole.ADMIN, [UserRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when customer accesses admin route', () => {
    const { guard, ctx } = mockContext(UserRole.CUSTOMER, [UserRole.ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no user is present', () => {
    const { guard, ctx } = mockContext(null, [UserRole.ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows customer to access customer route', () => {
    const { guard, ctx } = mockContext(UserRole.CUSTOMER, [UserRole.CUSTOMER]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows route that accepts both admin and customer', () => {
    const adminCtx = mockContext(UserRole.ADMIN, [UserRole.ADMIN, UserRole.CUSTOMER]);
    expect(adminCtx.guard.canActivate(adminCtx.ctx)).toBe(true);

    const customerCtx = mockContext(UserRole.CUSTOMER, [UserRole.ADMIN, UserRole.CUSTOMER]);
    expect(customerCtx.guard.canActivate(customerCtx.ctx)).toBe(true);
  });
});
