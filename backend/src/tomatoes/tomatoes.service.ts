import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTomatoSessionDto } from '../common/dto/create-tomato-session.dto';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class TomatoesService {
  constructor(
    private prisma: PrismaService,
    private tasksService: TasksService,
  ) {}

  async create(userId: string, createTomatoSessionDto: CreateTomatoSessionDto) {
    const session = await this.prisma.tomatoSession.create({
      data: {
        ...createTomatoSessionDto,
        user_id: userId,
      },
    });

    // Update task statistics if task_id is provided
    if (createTomatoSessionDto.task_id) {
      await this.tasksService.updateStats(
        createTomatoSessionDto.task_id,
        createTomatoSessionDto.planned_minutes,
        createTomatoSessionDto.actual_minutes,
      );
    }

    return session;
  }

  async findAll(userId: string, params?: { since?: string; task_id?: string }) {
    const where: Prisma.TomatoSessionWhereInput = { user_id: userId };

    if (params?.since) {
      where.started_at = { gte: new Date(params.since) };
    }

    if (params?.task_id) {
      where.task_id = params.task_id;
    }

    const sessions = await this.prisma.tomatoSession.findMany({
      where,
      orderBy: { started_at: 'desc' },
    });

    return {
      data: sessions,
      total: sessions.length,
      page: 1,
      limit: 100,
      hasMore: false,
    };
  }

  async findOne(userId: string, sessionId: string) {
    const session = await this.prisma.tomatoSession.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId,
      },
    });

    return session;
  }

  async getStatistics(userId: string) {
    const sessions = await this.prisma.tomatoSession.findMany({
      where: { user_id: userId },
      orderBy: { started_at: 'desc' },
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.actual_minutes,
      0,
    );
    const completedSessions = sessions.filter(
      (s) => s.status === 'COMPLETED',
    ).length;
    const interruptedSessions = sessions.filter(
      (s) => s.status === 'INTERRUPTED',
    ).length;

    // Group by date
    const sessionsByDate = sessions.reduce(
      (acc, session) => {
        const date = session.started_at.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { sessions: 0, minutes: 0 };
        }
        acc[date].sessions += 1;
        acc[date].minutes += session.actual_minutes;
        return acc;
      },
      {} as Record<string, { sessions: number; minutes: number }>,
    );

    return {
      totalSessions,
      totalMinutes,
      completedSessions,
      interruptedSessions,
      averageSessionLength:
        totalSessions > 0 ? totalMinutes / totalSessions : 0,
      sessionsByDate,
    };
  }
}
