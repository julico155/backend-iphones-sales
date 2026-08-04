import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const bcryptCompare = bcrypt.compare as jest.Mock;
const bcryptHash   = bcrypt.hash   as jest.Mock;

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
};

const mockJwt = { signAsync: jest.fn() };

const baseUser = {
  id: 'user-uuid',
  name: 'Test User',
  email: 'test@test.com',
  passwordHash: 'hashed',
  role: 'SELLER',
  tenantId: 'tenant-uuid',
  isActive: true,
  mustChangePassword: false,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt   },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      bcryptCompare.mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login({ email: baseUser.email, password: 'pass' });

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user.email).toBe(baseUser.email);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'x@x.com', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(service.login({ email: baseUser.email, password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      bcryptCompare.mockResolvedValue(false);

      await expect(service.login({ email: baseUser.email, password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('includes mustChangePassword in JWT payload', async () => {
      const userWithFlag = { ...baseUser, mustChangePassword: true };
      mockPrisma.user.findUnique.mockResolvedValue(userWithFlag);
      bcryptCompare.mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValue('token');

      await service.login({ email: baseUser.email, password: 'pass' });

      expect(mockJwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ mustChangePassword: true }),
      );
    });
  });

  // ── updatePassword ───────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('updates password and clears mustChangePassword flag', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      bcryptCompare.mockResolvedValue(true);
      bcryptHash.mockResolvedValue('new-hash');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updatePassword('user-uuid', {
        currentPassword: 'old',
        newPassword: 'new',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mustChangePassword: false }),
        }),
      );
      expect(result.message).toBeDefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('bad-id', { currentPassword: 'x', newPassword: 'y' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      bcryptCompare.mockResolvedValue(false);

      await expect(
        service.updatePassword('user-uuid', { currentPassword: 'wrong', newPassword: 'new' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── getProfile ───────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns user with tenant info', async () => {
      const profile = { ...baseUser, tenant: { name: 'Store', slug: 'store' } };
      mockPrisma.user.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile('user-uuid');

      expect(result.tenant).toBeDefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
