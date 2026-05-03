import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsDateString, IsNumber, IsOptional,
  IsPositive, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShowtimeDto {
  @ApiProperty()
  @IsUUID()
  movieId!: string;

  @ApiProperty()
  @IsUUID()
  screenId!: string;

  @ApiProperty({ example: '2024-08-01T14:00:00Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2024-08-01T16:30:00Z' })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ example: 200.00 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  basePrice!: number;
}

export class ShowtimeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  movieId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  screenId?: string;

  @ApiPropertyOptional({ example: '2024-08-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
