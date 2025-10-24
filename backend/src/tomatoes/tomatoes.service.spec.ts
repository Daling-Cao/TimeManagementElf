import { Test, TestingModule } from '@nestjs/testing';
import { TomatoesService } from './tomatoes.service';

describe('TomatoesService', () => {
  let service: TomatoesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TomatoesService],
    }).compile();

    service = module.get<TomatoesService>(TomatoesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
