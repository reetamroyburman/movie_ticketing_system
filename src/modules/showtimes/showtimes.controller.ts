import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto, ShowtimeQueryDto } from './showtime.dto';
import { Roles } from '../../middleware/roles.guard';
import { UserRole } from '../../config/constants';

@ApiTags('Showtimes')
@ApiBearerAuth()
@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a showtime (Admin)' })
  async create(@Body() dto: CreateShowtimeDto) {
    const showtime = await this.showtimesService.create(dto);
    return { success: true, data: showtime };
  }

  @Get()
  @ApiOperation({ summary: 'List showtimes with filters' })
  async findAll(@Query() query: ShowtimeQueryDto) {
    const result = await this.showtimesService.findAll(query);
    return {
      success: true,
      data: result.rows,
      meta: { total: result.count, page: query.page || 1, limit: query.limit || 10 },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get showtime details' })
  async findOne(@Param('id') id: string) {
    const showtime = await this.showtimesService.findOne(id);
    return { success: true, data: showtime };
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get full seat map for a showtime with availability status' })
  async getSeatMap(@Param('id') id: string) {
    const seats = await this.showtimesService.getSeatMap(id);
    return { success: true, data: seats };
  }
}
