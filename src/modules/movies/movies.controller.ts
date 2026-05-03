import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { CreateMovieDto, UpdateMovieDto, MovieQueryDto } from './movie.dto';
import { Roles } from '../../middleware/roles.guard';
import { UserRole } from '../../config/constants';

@ApiTags('Movies')
@ApiBearerAuth()
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a movie (Admin)' })
  async create(@Body() dto: CreateMovieDto) {
    const movie = await this.moviesService.create(dto);
    return { success: true, data: movie };
  }

  @Get()
  @ApiOperation({ summary: 'List movies with filters, search, and pagination' })
  async findAll(@Query() query: MovieQueryDto) {
    const result = await this.moviesService.findAll(query);
    return {
      success: true,
      data: result.rows,
      meta: {
        total: result.count,
        page: query.page || 1,
        limit: query.limit || 10,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie details' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async findOne(@Param('id') id: string) {
    const movie = await this.moviesService.findOne(id);
    return { success: true, data: movie };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update movie (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateMovieDto) {
    const movie = await this.moviesService.update(id, dto);
    return { success: true, data: movie };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete movie (Admin)' })
  async remove(@Param('id') id: string) {
    await this.moviesService.softDelete(id);
    return { success: true, message: 'Movie deleted successfully' };
  }
}
