import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const mockPrisma = {
  product: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
};

const TENANT_ID  = 'tenant-uuid';
const PRODUCT_ID = 'product-uuid';

const baseProduct = {
  id: PRODUCT_ID,
  tenantId: TENANT_ID,
  model: 'iPhone 15',
  storage: '128GB',
  color: 'Negro',
  suggestedPrice: 900,
  isActive: true,
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { model: 'iPhone 15', storage: '128GB', color: 'Negro', suggestedPrice: 900 };

    it('creates product successfully', async () => {
      mockPrisma.product.create.mockResolvedValue(baseProduct);

      const result = await service.create(TENANT_ID, dto);

      expect(result.model).toBe('iPhone 15');
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: TENANT_ID }) }),
      );
    });

    it('throws ConflictException on duplicate model+storage+color', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7',
      });
      mockPrisma.product.create.mockRejectedValue(prismaError);

      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns only active products for tenant', async () => {
      mockPrisma.product.findMany.mockResolvedValue([baseProduct]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_ID, isActive: true } }),
      );
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns product with items when found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ ...baseProduct, items: [] });

      const result = await service.findOne(TENANT_ID, PRODUCT_ID);

      expect(result.id).toBe(PRODUCT_ID);
    });

    it('throws NotFoundException when product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('does not return products from other tenants', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-tenant', PRODUCT_ID)).rejects.toThrow(NotFoundException);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PRODUCT_ID, tenantId: 'other-tenant' } }),
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates product successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ ...baseProduct, items: [] });
      mockPrisma.product.update.mockResolvedValue({ ...baseProduct, storage: '256GB' });

      const result = await service.update(TENANT_ID, PRODUCT_ID, { storage: '256GB' } as any);

      expect(result.storage).toBe('256GB');
    });

    it('throws NotFoundException when product not in tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft deletes product by setting isActive to false', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ ...baseProduct, items: [] });
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.remove(TENANT_ID, PRODUCT_ID);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.message).toContain('inactivado');
    });

    it('throws NotFoundException when product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.remove(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
