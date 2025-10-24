import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { TasksModule } from '../tasks/tasks.module';
import { TomatoesModule } from '../tomatoes/tomatoes.module';

@Module({
  imports: [TasksModule, TomatoesModule],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
