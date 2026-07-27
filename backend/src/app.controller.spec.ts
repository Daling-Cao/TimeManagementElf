import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return a health status payload', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.version).toBe('1.0.0');
      expect(typeof health.timestamp).toBe('string');
    });
  });
});
