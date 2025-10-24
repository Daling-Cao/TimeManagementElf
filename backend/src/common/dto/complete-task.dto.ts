import { IsString, IsInt } from 'class-validator';

export class CompleteTaskDto {
  @IsString()
  summary: string;

  @IsInt()
  version: number;
}
