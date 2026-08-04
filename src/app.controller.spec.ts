import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { Reflector } from '@nestjs/core';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [Reflector],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns status ok with a timestamp', () => {
      const result = controller.health();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
