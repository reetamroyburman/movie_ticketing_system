import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './booking.model';
import { BookedSeat } from './booked-seat.model';
import { SeatInventory } from '../showtimes/seat-inventory.model';
import { Showtime } from '../showtimes/showtime.model';
import { Movie } from '../movies/movie.model';
import { Screen } from '../screens/screen.model';
import { Seat } from '../screens/seat.model';
import { Payment } from '../payments/payment.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Booking,
      BookedSeat,
      SeatInventory,
      Showtime,
      Movie,
      Screen,
      Seat,
      Payment,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
