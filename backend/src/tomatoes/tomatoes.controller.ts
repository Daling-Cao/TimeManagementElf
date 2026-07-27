import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TomatoesService } from './tomatoes.service';
import { CreateTomatoSessionDto } from '../common/dto/create-tomato-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('tomatoes')
@UseGuards(JwtAuthGuard)
export class TomatoesController {
  constructor(private readonly tomatoesService: TomatoesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() createTomatoSessionDto: CreateTomatoSessionDto,
  ) {
    return this.tomatoesService.create(user.userId, createTomatoSessionDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('since') since?: string,
    @Query('task_id') task_id?: string,
  ) {
    return this.tomatoesService.findAll(user.userId, { since, task_id });
  }

  @Get('statistics')
  getStatistics(@CurrentUser() user: AuthUser) {
    return this.tomatoesService.getStatistics(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tomatoesService.findOne(user.userId, id);
  }
}
