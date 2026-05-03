import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { ReserveSeatsDto, ConfirmBookingDto, BookingQueryDto } from './booking.dto';
import { CurrentUser } from '../../middleware/current-user.decorator';
import { Roles } from '../../middleware/roles.guard';
import { User } from '../users/user.model';
import { UserRole } from '../../config/constants';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('reserve')
  @ApiOperation({ summary: 'Step 1: Reserve (hold) seats — atomically locks seats for 10 minutes' })
  @ApiResponse({ status: 201, description: 'Seats held, booking created in pending status' })
  @ApiResponse({ status: 409, description: 'SEAT_UNAVAILABLE — one or more seats already taken' })
  async reserve(@Body() dto: ReserveSeatsDto, @CurrentUser() user: User) {
    const booking = await this.bookingsService.reserve(dto, user);
    return {
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt,
        totalAmount: booking.totalAmount,
      },
    };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Confirm booking with mock payment' })
  @ApiResponse({ status: 200, description: 'Booking confirmed, payment recorded' })
  @ApiResponse({ status: 400, description: 'BOOKING_EXPIRED or BOOKING_NOT_PENDING' })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmBookingDto,
    @CurrentUser() user: User,
  ) {
    const booking = await this.bookingsService.confirm(id, dto, user);
    return { success: true, data: booking };
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's bookings (paginated)" })
  async getMyBookings(@CurrentUser() user: User, @Query() query: BookingQueryDto) {
    const result = await this.bookingsService.findMine(user, query);
    return {
      success: true,
      data: result.rows,
      meta: { total: result.count, page: query.page || 1, limit: query.limit || 10 },
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: List all bookings with filters' })
  async findAll(@Query() query: BookingQueryDto) {
    const result = await this.bookingsService.findAll(query);
    return {
      success: true,
      data: result.rows,
      meta: { total: result.count, page: query.page || 1, limit: query.limit || 10 },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details (customer sees own only; admin sees any)' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const booking = await this.bookingsService.findOne(id, user);
    return { success: true, data: booking };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking — customer cancels own, admin cancels any' })
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    await this.bookingsService.cancel(id, user);
    return { success: true, message: 'Booking cancelled successfully' };
  }
}
