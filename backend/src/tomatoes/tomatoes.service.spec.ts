import { Test, TestingModule } from '@nestjs/testing';
import { TomatoesService } from './tomatoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';

describe('TomatoesService', () => {
  let service: TomatoesService;

  const prismaMock = {
    tomatoSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const tasksServiceMock = {
    updateStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TomatoesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    }).compile();

    service = module.get<TomatoesService>(TomatoesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
