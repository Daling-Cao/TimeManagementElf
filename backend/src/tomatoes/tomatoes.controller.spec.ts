import { Test, TestingModule } from '@nestjs/testing';
import { TomatoesController } from './tomatoes.controller';

describe('TomatoesController', () => {
  let controller: TomatoesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TomatoesController],
    }).compile();

    controller = module.get<TomatoesController>(TomatoesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
