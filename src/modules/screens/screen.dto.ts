import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsInt, Min, Max,
  IsArray, ValidateNested, IsEnum, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeatType } from '../../config/constants';

export class RowTypeConfigDto {
  @ApiProperty({ description: 'Row letter e.g. A, B, C' })
  @IsString()
  row!: string;

  @ApiProperty({ enum: SeatType })
  @IsEnum(SeatType)
  seatType!: SeatType;
}

export class CreateScreenDto {
  @ApiProperty({ example: 'Screen 1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 10, description: 'Number of rows' })
  @IsInt()
  @Min(1)
  @Max(26)
  @Type(() => Number)
  rows!: number;

  @ApiProperty({ example: 15, description: 'Seats per row' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  seatsPerRow!: number;

  @ApiPropertyOptional({
    type: [RowTypeConfigDto],
    description: 'Map rows to seat types. Unmapped rows default to standard.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RowTypeConfigDto)
  rowTypeConfig?: RowTypeConfigDto[];
}
