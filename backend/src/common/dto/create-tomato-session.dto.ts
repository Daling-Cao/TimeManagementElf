import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export enum SessionStatus {
  COMPLETED = 'COMPLETED',
  INTERRUPTED = 'INTERRUPTED',
  CANCELLED = 'CANCELLED',
}

export class CreateTomatoSessionDto {
  @IsOptional()
  @IsString()
  task_id?: string;

  @IsString()
  task_type: string;

  @IsInt()
  @Min(1)
  @Max(120) // 2 hours max
  planned_minutes: number;

  @IsInt()
  @Min(0)
  @Max(120)
  actual_minutes: number;

  @IsDateString()
  started_at: string;

  @IsDateString()
  ended_at: string;

  @IsEnum(SessionStatus)
  status: SessionStatus;

  @IsOptional()
  @IsString()
  interruption_reason?: string;
}
