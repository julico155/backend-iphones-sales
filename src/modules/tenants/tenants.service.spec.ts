import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantPlan } from '@prisma/client';

const mockPrisma = {
  tenant: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
};

const TENANT_ID = 'tenant-uuid';

const baseTenant = {
  id: TENANT_ID,
  name: 'Mi Tienda',
  slug: 'mi-tienda',
  plan: TenantPlan.BASIC,
  isActive: true,
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates tenant with unique slug', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue(baseTenant);

      const result = await service.create({ name: 'Mi Tienda', slug: 'mi-tienda' });

      expect(result.slug).toBe('mi-tienda');
    });

    it('throws ConflictException when slug already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);

      await expect(service.create({ name: 'Otra', slug: 'mi-tienda' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all tenants ordered by createdAt desc', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([baseTenant]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  // ── updatePlan ───────────────────────────────────────────────────────────

  describe('updatePlan', () => {
    it('updates plan successfully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
      mockPrisma.tenant.update.mockResolvedValue({ ...baseTenant, plan: TenantPlan.PRO });

      const result = await service.updatePlan(TENANT_ID, { plan: TenantPlan.PRO });

      expect(result.tenant.plan).toBe(TenantPlan.PRO);
      expect(result.message).toContain('PRO');
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.updatePlan('bad-id', { plan: TenantPlan.PRO }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when trying to modify system-admin', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...baseTenant, slug: 'system-admin' });

      await expect(service.updatePlan(TENANT_ID, { plan: TenantPlan.PRO }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── toggleActive ─────────────────────────────────────────────────────────

  describe('toggleActive', () => {
    it('deactivates an active tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
      mockPrisma.tenant.update.mockResolvedValue({ ...baseTenant, isActive: false });

      const result = await service.toggleActive(TENANT_ID);

      expect(result.tenant.isActive).toBe(false);
      expect(result.message).toContain('desactivada');
    });

    it('activates an inactive tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...baseTenant, isActive: false });
      mockPrisma.tenant.update.mockResolvedValue({ ...baseTenant, isActive: true });

      const result = await service.toggleActive(TENANT_ID);

      expect(result.tenant.isActive).toBe(true);
      expect(result.message).toContain('activada');
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when trying to deactivate system-admin', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...baseTenant, slug: 'system-admin' });

      await expect(service.toggleActive(TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });
});
