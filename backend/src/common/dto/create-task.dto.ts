import { IsString, IsEnum, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  task_type: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480) // 8 hours max
  estimate_minutes?: number;
}
