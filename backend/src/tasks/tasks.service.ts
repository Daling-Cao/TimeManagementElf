import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from '../common/dto/create-task.dto';
import { UpdateTaskDto } from '../common/dto/update-task.dto';
import { CompleteTaskDto } from '../common/dto/complete-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTaskDto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        user_id: userId,
      },
    });

    return task;
  }

  async findAll(userId: string, params?: { since?: string; status?: string; type?: string }) {
    const where: any = { user_id: userId };

    if (params?.since) {
      where.updated_at = { gte: new Date(params.since) };
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.type) {
      where.task_type = params.type;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data: tasks,
      total: tasks.length,
      page: 1,
      limit: 100,
      hasMore: false,
    };
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        task_id: taskId,
        user_id: userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(userId: string, taskId: string, updateTaskDto: UpdateTaskDto) {
    const existingTask = await this.findOne(userId, taskId);

    // Check version conflict
    if (existingTask.version !== updateTaskDto.version) {
      throw new ConflictException('Version conflict. Please refresh and try again.');
    }

    const task = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        ...updateTaskDto,
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return task;
  }

  async complete(userId: string, taskId: string, completeTaskDto: CompleteTaskDto) {
    const existingTask = await this.findOne(userId, taskId);

    // Check version conflict
    if (existingTask.version !== completeTaskDto.version) {
      throw new ConflictException('Version conflict. Please refresh and try again.');
    }

    const task = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: 'DONE',
        summary: completeTaskDto.summary,
        completed_at: new Date(),
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return task;
  }

  async remove(userId: string, taskId: string) {
    await this.findOne(userId, taskId);

    await this.prisma.task.delete({
      where: { task_id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  async updateStats(taskId: string, focusMinutes: number, actualMinutes: number) {
    await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        stats_focus_minutes: { increment: focusMinutes },
        stats_actual_minutes: { increment: actualMinutes },
        stats_sessions_count: { increment: 1 },
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });
  }
}