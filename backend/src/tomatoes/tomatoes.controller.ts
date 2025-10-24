import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { TomatoesService } from './tomatoes.service';
import { CreateTomatoSessionDto } from '../common/dto/create-tomato-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/user.decorator';

@Controller('tomatoes')
@UseGuards(JwtAuthGuard)
export class TomatoesController {
  constructor(private readonly tomatoesService: TomatoesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createTomatoSessionDto: CreateTomatoSessionDto) {
    return this.tomatoesService.create(user.userId, createTomatoSessionDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('since') since?: string,
    @Query('task_id') task_id?: string,
  ) {
    return this.tomatoesService.findAll(user.userId, { since, task_id });
  }

  @Get('statistics')
  getStatistics(@CurrentUser() user: any) {
    return this.tomatoesService.getStatistics(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tomatoesService.findOne(user.userId, id);
  }
}