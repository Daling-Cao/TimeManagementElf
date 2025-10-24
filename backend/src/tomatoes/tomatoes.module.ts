import { Module } from '@nestjs/common';
import { TomatoesService } from './tomatoes.service';
import { TomatoesController } from './tomatoes.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  controllers: [TomatoesController],
  providers: [TomatoesService],
  exports: [TomatoesService],
})
export class TomatoesModule {}