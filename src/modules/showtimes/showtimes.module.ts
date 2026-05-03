import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { Showtime } from './showtime.model';
import { SeatInventory } from './seat-inventory.model';
import { Seat } from '../screens/seat.model';
import { Screen } from '../screens/screen.model';
import { Movie } from '../movies/movie.model';

@Module({
  imports: [SequelizeModule.forFeature([Showtime, SeatInventory, Seat, Screen, Movie])],
  controllers: [ShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService, SequelizeModule],
})
export class ShowtimesModule {}
