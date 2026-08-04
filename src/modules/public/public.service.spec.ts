import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  tenant: { findFirst: jest.fn() },
  item:   { findMany: jest.fn() },
};

const TENANT_ID = 'tenant-uuid';
const baseTenant = { id: TENANT_ID, name: 'Mi Tienda', slug: 'mi-tienda', isActive: true };
const baseItem   = { id: 'item-uuid', status: 'AVAILABLE', salePrice: 1100 };

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    jest.clearAllMocks();
  });

  // ── findBySlug ───────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns tenant when slug matches', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(baseTenant);

      const result = await service.findBySlug('mi-tienda');

      expect(result?.slug).toBe('mi-tienda');
    });

    it('normalizes slug to lowercase and trims spaces', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(baseTenant);

      await service.findBySlug('  MI-TIENDA  ');

      expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'mi-tienda' } }),
      );
    });

    it('returns null when slug not found', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(null);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ── findAvailableItemsBySlug ─────────────────────────────────────────────

  describe('findAvailableItemsBySlug', () => {
    it('returns available items for existing tenant', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(baseTenant);
      mockPrisma.item.findMany.mockResolvedValue([baseItem]);

      const result = await service.findAvailableItemsBySlug('mi-tienda');

      expect(result).toHaveLength(1);
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, status: 'AVAILABLE' }),
        }),
      );
    });

    it('returns empty array when tenant not found', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(null);

      const result = await service.findAvailableItemsBySlug('nonexistent');

      expect(result).toEqual([]);
      expect(mockPrisma.item.findMany).not.toHaveBeenCalled();
    });

    it('returns empty array when no items available', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(baseTenant);
      mockPrisma.item.findMany.mockResolvedValue([]);

      const result = await service.findAvailableItemsBySlug('mi-tienda');

      expect(result).toEqual([]);
    });
  });
});
