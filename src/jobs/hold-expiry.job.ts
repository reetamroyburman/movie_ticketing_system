import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../modules/bookings/bookings.service';

@Injectable()
export class HoldExpiryJob {
  private readonly logger = new Logger(HoldExpiryJob.name);

  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Runs every minute.
   * Finds all SeatInventory rows with status = held and heldUntil < NOW(),
   * reverts them to available, and marks associated pending bookings as expired.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleHoldExpiry(): Promise<void> {
    try {
      await this.bookingsService.expireStaleHolds();
      this.logger.debug('Hold expiry job completed');
    } catch (error) {
      this.logger.error('Hold expiry job failed', (error as Error).stack);
    }
  }
}
