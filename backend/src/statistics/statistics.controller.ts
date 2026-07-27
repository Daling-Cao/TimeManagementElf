import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { TasksService } from '../tasks/tasks.service';
import { TomatoesService } from '../tomatoes/tomatoes.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(
    private tasksService: TasksService,
    private tomatoesService: TomatoesService,
  ) {}

  @Get('tasks')
  async getTaskStatistics(@CurrentUser() user: AuthUser) {
    const tasks = await this.tasksService.findAll(user.userId);

    const totalTasks = tasks.data.length;
    const completedTasks = tasks.data.filter(
      (task) => task.status === 'DONE',
    ).length;
    const inProgressTasks = tasks.data.filter(
      (task) => task.status === 'IN_PROGRESS',
    ).length;
    const todoTasks = tasks.data.filter(
      (task) => task.status === 'TODO',
    ).length;

    // Group by type
    const tasksByType = tasks.data.reduce(
      (acc, task) => {
        if (!acc[task.task_type]) {
          acc[task.task_type] = 0;
        }
        acc[task.task_type] += 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by priority
    const tasksByPriority = tasks.data.reduce(
      (acc, task) => {
        if (!acc[task.priority]) {
          acc[task.priority] = 0;
        }
        acc[task.priority] += 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      tasksByType,
      tasksByPriority,
    };
  }

  @Get('tomato-sessions')
  async getTomatoStatistics(@CurrentUser() user: AuthUser) {
    return this.tomatoesService.getStatistics(user.userId);
  }

  @Get('summary')
  async getSummaryStatistics(@CurrentUser() user: AuthUser) {
    const [taskStats, tomatoStats] = await Promise.all([
      this.getTaskStatistics(user),
      this.tomatoesService.getStatistics(user.userId),
    ]);

    return {
      tasks: taskStats,
      tomatoes: tomatoStats,
      summary: {
        totalFocusTime: tomatoStats.totalMinutes,
        totalTasks: taskStats.totalTasks,
        totalSessions: tomatoStats.totalSessions,
        averageSessionLength: tomatoStats.averageSessionLength,
        completionRate: taskStats.completionRate,
      },
    };
  }
}
