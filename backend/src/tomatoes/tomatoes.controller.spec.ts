import { Test, TestingModule } from '@nestjs/testing';
import { TomatoesController } from './tomatoes.controller';
import { TomatoesService } from './tomatoes.service';

describe('TomatoesController', () => {
  let controller: TomatoesController;

  const tomatoesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TomatoesController],
      providers: [{ provide: TomatoesService, useValue: tomatoesServiceMock }],
    }).compile();

    controller = module.get<TomatoesController>(TomatoesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
