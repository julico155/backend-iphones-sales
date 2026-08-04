import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, TenantPlan } from '@prisma/client';

const mockPrisma = {
  tenant:  { findUnique: jest.fn() },
  item:    { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), groupBy: jest.fn() },
  product: { findMany: jest.fn() },
};

const TENANT_ID = 'tenant-uuid';
const ITEM_ID   = 'item-uuid';

const basicTenant  = { id: TENANT_ID, plan: TenantPlan.BASIC };
const baseItem     = { id: ITEM_ID, tenantId: TENANT_ID, imei: '123456789012345', status: 'AVAILABLE' };
const createItemDto = {
  productId: 'product-uuid',
  imei: '123456789012345',
  serialNumber: 'SN001',
  batteryHealth: 95,
  condition: 'NEW' as const,
  costPrice: 800,
  salePrice: 1100,
  notes: '',
  images: [],
};

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    jest.clearAllMocks();
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates item when plan limit is not reached', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.item.count.mockResolvedValue(10); // BASIC limit = 20
      mockPrisma.item.create.mockResolvedValue(baseItem);

      const result = await service.create(TENANT_ID, createItemDto);

      expect(result).toEqual(baseItem);
      expect(mockPrisma.item.create).toHaveBeenCalled();
    });

    it('throws ForbiddenException when plan item limit is reached', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.item.count.mockResolvedValue(20); // BASIC limit = 20

      await expect(service.create(TENANT_ID, createItemDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on duplicate IMEI', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(basicTenant);
      mockPrisma.item.count.mockResolvedValue(0);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7',
      });
      mockPrisma.item.create.mockRejectedValue(prismaError);

      await expect(service.create(TENANT_ID, createItemDto)).rejects.toThrow(ConflictException);
    });

    it('allows PRO plan to have 50 items', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, plan: TenantPlan.PRO });
      mockPrisma.item.count.mockResolvedValue(49);
      mockPrisma.item.create.mockResolvedValue(baseItem);

      await expect(service.create(TENANT_ID, createItemDto)).resolves.toBeDefined();
    });
  });

  // ── softDelete ───────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets item status to INACTIVE', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(baseItem);
      mockPrisma.item.update.mockResolvedValue({});

      const result = await service.softDelete(TENANT_ID, ITEM_ID);

      expect(mockPrisma.item.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'INACTIVE' } }),
      );
      expect(result.message).toContain('baja');
    });

    it('throws NotFoundException when item not found', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated items excluding INACTIVE by default', async () => {
      mockPrisma.item.findMany.mockResolvedValue([baseItem]);
      mockPrisma.item.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'INACTIVE' } }),
        }),
      );
    });

    it('applies status filter when provided', async () => {
      mockPrisma.item.findMany.mockResolvedValue([{ ...baseItem, status: 'SOLD' }]);
      mockPrisma.item.count.mockResolvedValue(1);

      await service.findAll(TENANT_ID, { status: 'SOLD' as any });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SOLD' }),
        }),
      );
    });

    it('calculates correct totalPages', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(55);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns item with product', async () => {
      mockPrisma.item.findFirst.mockResolvedValue({ ...baseItem, product: {} });

      const result = await service.findOne(TENANT_ID, ITEM_ID);

      expect(result.id).toBe(ITEM_ID);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByImeiOrSerial ───────────────────────────────────────────────────

  describe('findByImeiOrSerial', () => {
    it('finds AVAILABLE item by IMEI', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(baseItem);

      const result = await service.findByImeiOrSerial(TENANT_ID, '123456789012345');

      expect(result.imei).toBe('123456789012345');
    });

    it('throws NotFoundException when no AVAILABLE item matches', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      await expect(service.findByImeiOrSerial(TENANT_ID, 'notfound')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getInventorySummary ──────────────────────────────────────────────────

  describe('getInventorySummary', () => {
    it('groups items by product with status counts', async () => {
      const productId = 'product-uuid';
      mockPrisma.item.groupBy.mockResolvedValue([
        { productId, status: 'AVAILABLE', _count: { _all: 3 } },
        { productId, status: 'SOLD',      _count: { _all: 7 } },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: productId, model: 'iPhone 15', storage: '128GB', color: 'Negro' },
      ]);

      const result = await service.getInventorySummary(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(3);
      expect(result[0].sold).toBe(7);
      expect(result[0].total).toBe(10);
    });

    it('returns empty array when no items', async () => {
      mockPrisma.item.groupBy.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.getInventorySummary(TENANT_ID);

      expect(result).toHaveLength(0);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates item when it belongs to tenant', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(baseItem);
      mockPrisma.item.update.mockResolvedValue({ ...baseItem, salePrice: 1200 });

      const result = await service.update(TENANT_ID, ITEM_ID, { salePrice: 1200 } as any);

      expect(mockPrisma.item.update).toHaveBeenCalled();
      expect(result.salePrice).toBe(1200);
    });

    it('throws NotFoundException when item not in tenant', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
