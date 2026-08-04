import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const bcryptHash = bcrypt.hash as jest.Mock;

const mockPrisma = {
  user:   { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  tenant: { findUnique: jest.fn() },
};

const TENANT_ID = 'tenant-uuid';
const USER_ID   = 'user-uuid';

const basicTenant = { id: TENANT_ID, plan: TenantPlan.BASIC };
const baseUser    = { id: USER_ID, name: 'Test', email: 'test@test.com', role: UserRole.SELLER, isActive: true, tenantId: TENANT_ID };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    bcryptHash.mockResolvedValue('hashed');
  });

  // ── create (global / sys admin) ──────────────────────────────────────────

  describe('create', () => {
    const dto = { name: 'Test', email: 'test@test.com', password: 'pass', role: UserRole.SELLER, tenantId: TENANT_ID };

    it('creates user successfully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.create(dto);

      expect(result.email).toBe(dto.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── createForTenant ──────────────────────────────────────────────────────

  describe('createForTenant', () => {
    const dto = { name: 'New User', email: 'new@test.com', password: 'pass', role: UserRole.SELLER };

    it('creates team user when plan limit not reached', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.user.count.mockResolvedValue(1); // BASIC limit = 2
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...baseUser, mustChangePassword: true });

      const result = await service.createForTenant(TENANT_ID, dto);

      expect(result.mustChangePassword).toBe(true);
    });

    it('throws ForbiddenException when plan user limit is reached', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.user.count.mockResolvedValue(2); // BASIC limit = 2

      await expect(service.createForTenant(TENANT_ID, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(service.createForTenant(TENANT_ID, dto)).rejects.toThrow(ConflictException);
    });

    it('allows PRO plan to create up to 5 users', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, plan: TenantPlan.PRO });
      mockPrisma.user.count.mockResolvedValue(4); // PRO limit = 5
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...baseUser, mustChangePassword: true });

      await expect(service.createForTenant(TENANT_ID, dto)).resolves.toBeDefined();
    });
  });

  // ── findAllByTenant ──────────────────────────────────────────────────────

  describe('findAllByTenant', () => {
    it('returns users belonging to tenant', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);

      const result = await service.findAllByTenant(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_ID } }),
      );
    });
  });

  // ── findAllGlobal ────────────────────────────────────────────────────────

  describe('findAllGlobal', () => {
    it('returns all users with tenant info', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ ...baseUser, tenant: { name: 'Store', slug: 'store' } }]);

      const result = await service.findAllGlobal();

      expect(result[0].tenant).toBeDefined();
    });
  });

  // ── toggleActive ─────────────────────────────────────────────────────────

  describe('toggleActive', () => {
    it('deactivates an active user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, isActive: false });

      const result = await service.toggleActive(TENANT_ID, USER_ID, 'other-user-uuid');

      expect(result.user.isActive).toBe(false);
      expect(result.message).toContain('desactivado');
    });

    it('activates an inactive user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, isActive: false });
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, isActive: true });

      const result = await service.toggleActive(TENANT_ID, USER_ID, 'other-user-uuid');

      expect(result.user.isActive).toBe(true);
      expect(result.message).toContain('activado');
    });

    it('throws NotFoundException when user not in tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.toggleActive(TENANT_ID, 'bad-id', 'requester-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when deactivating own user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser);

      await expect(service.toggleActive(TENANT_ID, USER_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });
  });
});
