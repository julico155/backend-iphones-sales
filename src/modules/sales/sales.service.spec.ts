import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaleStatus, ItemStatus, PaymentMethod } from '@prisma/client';

const mockTx = {
  item:       { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  sale:       { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  saleDetail: { create: jest.fn() },
};

const mockPrisma = {
  sale:       { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
  saleDetail: { findMany: jest.fn(), count: jest.fn() },
  item:       { count: jest.fn() },
  client:     { $transaction: jest.fn((fn: any) => fn(mockTx)) },
};

const TENANT_ID = 'tenant-uuid';
const USER_ID   = 'user-uuid';
const SALE_ID   = 'sale-uuid';
const ITEM_ID   = 'item-uuid';

const baseItem = {
  id: ITEM_ID,
  tenantId: TENANT_ID,
  imei: '123456789012345',
  status: ItemStatus.AVAILABLE,
};

const baseSale = {
  id: SALE_ID,
  tenantId: TENANT_ID,
  status: SaleStatus.ACTIVE,
  saleDetails: [{ id: 'detail-uuid', itemId: ITEM_ID }],
};

const createDto = {
  customerName: 'Cliente',
  customerPhone: '70012345',
  paymentMethod: PaymentMethod.CASH,
  items: [{ itemId: ITEM_ID, priceSold: 1000 }],
};

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    jest.clearAllMocks();
    mockPrisma.client.$transaction.mockImplementation((fn: any) => fn(mockTx));
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates sale and marks items as SOLD', async () => {
      mockTx.item.findMany.mockResolvedValue([baseItem]);
      mockTx.sale.create.mockResolvedValue({ id: SALE_ID });
      mockTx.saleDetail.create.mockResolvedValue({});
      mockTx.item.update.mockResolvedValue({});
      mockTx.sale.findUnique.mockResolvedValue({ ...baseSale, saleDetails: [] });

      const result = await service.create(TENANT_ID, USER_ID, createDto);

      expect(mockTx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID }) }),
      );
      expect(mockTx.item.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: ItemStatus.SOLD } }),
      );
      expect(result).toBeDefined();
    });

    it('throws BadRequestException when items array is empty', async () => {
      await expect(
        service.create(TENANT_ID, USER_ID, { ...createDto, items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when items do not belong to tenant', async () => {
      mockTx.item.findMany.mockResolvedValue([]);

      await expect(service.create(TENANT_ID, USER_ID, createDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when item is not AVAILABLE', async () => {
      mockTx.item.findMany.mockResolvedValue([{ ...baseItem, status: ItemStatus.SOLD }]);

      await expect(service.create(TENANT_ID, USER_ID, createDto)).rejects.toThrow(BadRequestException);
    });

    it('calculates totalAmount correctly for multiple items', async () => {
      const items = [
        { itemId: 'item-1', priceSold: 800 },
        { itemId: 'item-2', priceSold: 1200 },
      ];
      const dbItems = [
        { ...baseItem, id: 'item-1' },
        { ...baseItem, id: 'item-2' },
      ];

      mockTx.item.findMany.mockResolvedValue(dbItems);
      mockTx.sale.create.mockResolvedValue({ id: SALE_ID });
      mockTx.saleDetail.create.mockResolvedValue({});
      mockTx.item.update.mockResolvedValue({});
      mockTx.sale.findUnique.mockResolvedValue(baseSale);

      await service.create(TENANT_ID, USER_ID, { ...createDto, items });

      expect(mockTx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 2000 }) }),
      );
    });
  });

  // ── getHistoryByTenant ───────────────────────────────────────────────────

  describe('getHistoryByTenant', () => {
    it('returns paginated sales with meta', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([baseSale]);
      mockPrisma.sale.count.mockResolvedValue(1);

      const result = await service.getHistoryByTenant(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('applies status filter when provided', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(0);

      await service.getHistoryByTenant(TENANT_ID, { status: SaleStatus.CANCELLED });

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: SaleStatus.CANCELLED }) }),
      );
    });

    it('applies userId filter when provided', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(0);

      await service.getHistoryByTenant(TENANT_ID, { userId: USER_ID });

      expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: USER_ID }) }),
      );
    });

    it('calculates correct totalPages', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.sale.count.mockResolvedValue(45);

      const result = await service.getHistoryByTenant(TENANT_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ── getDashboardSummary ──────────────────────────────────────────────────

  describe('getDashboardSummary', () => {
    it('returns revenue, profit and available items', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { totalAmount: 5000 }, _count: { id: 4 } });
      mockPrisma.saleDetail.findMany.mockResolvedValue([
        { item: { costPrice: 800 } },
        { item: { costPrice: 700 } },
      ]);
      mockPrisma.saleDetail.count.mockResolvedValue(2);
      mockPrisma.item.count.mockResolvedValue(10);

      const result = await service.getDashboardSummary(TENANT_ID);

      expect(result.totalRevenue).toBe(5000);
      expect(result.totalCost).toBe(1500);
      expect(result.grossProfit).toBe(3500);
      expect(result.profitMarginPercent).toBe(70);
      expect(result.availableItemsCount).toBe(10);
    });

    it('returns 0 margin when revenue is 0', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { totalAmount: null }, _count: { id: 0 } });
      mockPrisma.saleDetail.findMany.mockResolvedValue([]);
      mockPrisma.saleDetail.count.mockResolvedValue(0);
      mockPrisma.item.count.mockResolvedValue(0);

      const result = await service.getDashboardSummary(TENANT_ID);

      expect(result.profitMarginPercent).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });

    it('handles items with null costPrice', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000 }, _count: { id: 1 } });
      mockPrisma.saleDetail.findMany.mockResolvedValue([{ item: { costPrice: null } }]);
      mockPrisma.saleDetail.count.mockResolvedValue(1);
      mockPrisma.item.count.mockResolvedValue(0);

      const result = await service.getDashboardSummary(TENANT_ID);

      expect(result.totalCost).toBe(0);
      expect(result.grossProfit).toBe(1000);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns sale when found', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(baseSale);

      const result = await service.findOne(TENANT_ID, SALE_ID);

      expect(result.id).toBe(SALE_ID);
    });

    it('throws NotFoundException when sale not found', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancel ───────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancels sale and restores items to AVAILABLE', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(baseSale);
      mockTx.sale.update.mockResolvedValue({ id: SALE_ID });
      mockTx.item.updateMany.mockResolvedValue({});

      const result = await service.cancel(TENANT_ID, SALE_ID);

      expect(mockTx.item.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'AVAILABLE' } }),
      );
      expect(result.message).toContain('anulada');
    });

    it('throws NotFoundException when sale not found', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.cancel(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when sale already cancelled', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({ ...baseSale, status: SaleStatus.CANCELLED });

      await expect(service.cancel(TENANT_ID, SALE_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
