import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import configuration from './config/configuration';
import { GlobalExceptionFilter } from './middleware/global-exception.filter';
import { JwtAuthGuard } from './middleware/jwt-auth.guard';
import { RolesGuard } from './middleware/roles.guard';

import { AuthModule } from './modules/auth/auth.module';
import { MoviesModule } from './modules/movies/movies.module';
import { ScreensModule } from './modules/screens/screens.module';
import { ShowtimesModule } from './modules/showtimes/showtimes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { JobsModule } from './jobs/jobs.module';

// Models
import { User } from './modules/users/user.model';
import { RefreshToken } from './modules/auth/refresh-token.model';
import { Movie } from './modules/movies/movie.model';
import { Screen } from './modules/screens/screen.model';
import { Seat } from './modules/screens/seat.model';
import { Showtime } from './modules/showtimes/showtime.model';
import { SeatInventory } from './modules/showtimes/seat-inventory.model';
import { Booking } from './modules/bookings/booking.model';
import { BookedSeat } from './modules/bookings/booked-seat.model';
import { Payment } from './modules/payments/payment.model';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'mysql',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        models: [
          User,
          RefreshToken,
          Movie,
          Screen,
          Seat,
          Showtime,
          SeatInventory,
          Booking,
          BookedSeat,
          Payment,
        ],
        autoLoadModels: false,
        synchronize: false, // always use migrations
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    MoviesModule,
    ScreensModule,
    ShowtimesModule,
    BookingsModule,
    PaymentsModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
