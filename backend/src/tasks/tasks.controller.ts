import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from '../common/dto/create-task.dto';
import { UpdateTaskDto } from '../common/dto/update-task.dto';
import { CompleteTaskDto } from '../common/dto/complete-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(user.userId, createTaskDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('since') since?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.tasksService.findAll(user.userId, { since, status, type });
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.userId, id, updateTaskDto);
  }

  @Patch(':id/complete')
  complete(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ) {
    return this.tasksService.complete(user.userId, id, completeTaskDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.remove(user.userId, id);
  }
}