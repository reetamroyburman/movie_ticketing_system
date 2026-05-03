import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScreensService } from './screens.service';
import { CreateScreenDto } from './screen.dto';
import { Roles } from '../../middleware/roles.guard';
import { UserRole } from '../../config/constants';

@ApiTags('Screens')
@ApiBearerAuth()
@Controller('screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a screen with seat layout (Admin)' })
  async create(@Body() dto: CreateScreenDto) {
    const screen = await this.screensService.create(dto);
    return { success: true, data: screen };
  }

  @Get()
  @ApiOperation({ summary: 'List all screens' })
  async findAll() {
    const screens = await this.screensService.findAll();
    return { success: true, data: screens };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get screen details with seat map' })
  async findOne(@Param('id') id: string) {
    const screen = await this.screensService.findOne(id);
    return { success: true, data: screen };
  }
}
