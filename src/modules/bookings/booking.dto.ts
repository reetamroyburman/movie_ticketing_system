import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsArray, ArrayMinSize, IsString,
  IsOptional, IsEnum, IsDateString, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../config/constants';

export class ReserveSeatsDto {
  @ApiProperty()
  @IsUUID()
  showtimeId!: string;

  @ApiProperty({ type: [String], description: 'Array of seat IDs (from Seat table)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  seatIds!: string[];
}

export class ConfirmBookingDto {
  @ApiProperty({ example: 'card' })
  @IsString()
  paymentMethod!: string;

  @ApiPropertyOptional({ example: '4242' })
  @IsOptional()
  @IsString()
  cardLastFour?: string;
}

export class BookingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  showtimeId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: '2024-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
