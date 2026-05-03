import { Module } from '@nestjs/common';
import { HoldExpiryJob } from './hold-expiry.job';
import { BookingsModule } from '../modules/bookings/bookings.module';

@Module({
  imports: [BookingsModule],
  providers: [HoldExpiryJob],
})
export class JobsModule {}
