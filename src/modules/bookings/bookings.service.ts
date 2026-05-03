import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from './booking.model';
import { BookedSeat } from './booked-seat.model';
import { SeatInventory } from '../showtimes/seat-inventory.model';
import { Showtime } from '../showtimes/showtime.model';
import { Movie } from '../movies/movie.model';
import { Screen } from '../screens/screen.model';
import { Seat } from '../screens/seat.model';
import { Payment } from '../payments/payment.model';
import { User } from '../users/user.model';
import { ReserveSeatsDto, ConfirmBookingDto, BookingQueryDto } from './booking.dto';
import {
  BookingStatus,
  SeatInventoryStatus,
  PaymentStatus,
  UserRole,
  HOLD_EXPIRY_MINUTES,
} from '../../config/constants';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking) private bookingModel: typeof Booking,
    @InjectModel(BookedSeat) private bookedSeatModel: typeof BookedSeat,
    @InjectModel(SeatInventory) private seatInventoryModel: typeof SeatInventory,
    @InjectModel(Showtime) private showtimeModel: typeof Showtime,
    @InjectModel(Payment) private paymentModel: typeof Payment,
    private sequelize: Sequelize,
  ) {}

  /**
   * CONCURRENCY STRATEGY: Pessimistic Locking (SELECT ... FOR UPDATE)
   *
   * We use a database-level row lock inside a transaction. When multiple requests
   * try to reserve the same seat simultaneously:
   *  1. The first transaction acquires a FOR UPDATE lock on the SeatInventory rows.
   *  2. Subsequent transactions attempting to lock the same rows block and wait.
   *  3. Once the first transaction commits, the second transaction reads the
   *     updated status ('held') and correctly returns a 409 Conflict.
   *
   * This is safe under horizontal scaling because the lock lives in the DB, not in memory.
   */
  async reserve(dto: ReserveSeatsDto, user: User): Promise<Booking> {
    return this.sequelize.transaction(async (t: Transaction) => {
      const showtime = await this.showtimeModel.findByPk(dto.showtimeId);
      if (!showtime) {
        throw new NotFoundException({ code: 'SHOWTIME_NOT_FOUND', message: 'Showtime not found' });
      }

      // SELECT ... FOR UPDATE — acquires exclusive row locks on these specific inventory rows.
      // Concurrent transactions requesting ANY of the same rows will wait until this tx commits/rolls back.
      const inventoryRows = await this.seatInventoryModel.findAll({
        where: {
          showtimeId: dto.showtimeId,
          seatId: { [Op.in]: dto.seatIds },
        },
        lock: Transaction.LOCK.UPDATE,
        transaction: t,
      });

      // Validate all requested seats belong to this showtime
      if (inventoryRows.length !== dto.seatIds.length) {
        throw new BadRequestException({
          code: 'SEAT_NOT_FOUND',
          message: 'One or more seat IDs do not belong to this showtime',
        });
      }

      // After acquiring the lock, check current status.
      // The second concurrent transaction will see the committed 'held' status here.
      const unavailable = inventoryRows.filter(
        (row) => row.status !== SeatInventoryStatus.AVAILABLE,
      );

      if (unavailable.length > 0) {
        throw new ConflictException({
          code: 'SEAT_UNAVAILABLE',
          message: 'One or more selected seats are no longer available.',
          details: unavailable.map((s) => s.seatId),
        });
      }

      const holdExpiresAt = new Date();
      holdExpiresAt.setMinutes(holdExpiresAt.getMinutes() + HOLD_EXPIRY_MINUTES);

      const totalAmount = inventoryRows.reduce(
        (sum, row) => sum + parseFloat(row.price as unknown as string),
        0,
      );

      // Transition: available -> held
      await this.seatInventoryModel.update(
        { status: SeatInventoryStatus.HELD, heldUntil: holdExpiresAt },
        {
          where: { id: { [Op.in]: inventoryRows.map((r) => r.id) } },
          transaction: t,
        },
      );

      const booking = await this.bookingModel.create(
        {
          id: uuidv4(),
          userId: user.id,
          showtimeId: dto.showtimeId,
          status: BookingStatus.PENDING,
          holdExpiresAt,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
        },
        { transaction: t },
      );

      const bookedSeats = inventoryRows.map((row) => ({
        id: uuidv4(),
        bookingId: booking.id,
        seatInventoryId: row.id,
      }));

      await this.bookedSeatModel.bulkCreate(bookedSeats , { transaction: t });

      return booking;
    });
  }

  async confirm(bookingId: string, dto: ConfirmBookingDto, user: User): Promise<Booking> {
    return this.sequelize.transaction(async (t: Transaction) => {
      const booking = await this.bookingModel.findByPk(bookingId, {
        lock: Transaction.LOCK.UPDATE,
        transaction: t,
        include: [{ model: BookedSeat }],
      });

      if (!booking) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      }

      this.assertOwnerOrAdmin(booking, user);

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException({
          code: 'BOOKING_NOT_PENDING',
          message: `Booking is already ${booking.status}`,
        });
      }

      if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
        throw new BadRequestException({
          code: 'BOOKING_EXPIRED',
          message: 'Hold has expired. Please re-select your seats.',
        });
      }

      const seatInventoryIds = booking.bookedSeats.map((bs) => bs.seatInventoryId);

      // Transition: held -> booked
      await this.seatInventoryModel.update(
        { status: SeatInventoryStatus.BOOKED, heldUntil: null },
        { where: { id: { [Op.in]: seatInventoryIds } }, transaction: t },
      );

      const bookingReference = `BKG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      await booking.update(
        { status: BookingStatus.CONFIRMED, bookingReference, holdExpiresAt: null },
        { transaction: t },
      );

      await this.paymentModel.create(
        {
          id: uuidv4(),
          bookingId: booking.id,
          amount: booking.totalAmount,
          status: PaymentStatus.COMPLETED,
          paymentMethod: dto.paymentMethod,
          cardLastFour: dto.cardLastFour || null,
          transactionId: `TXN-${uuidv4()}`,
        },
        { transaction: t },
      );

      return this.findOneById(bookingId);
    });
  }

  async cancel(bookingId: string, user: User): Promise<Booking> {
    return this.sequelize.transaction(async (t: Transaction) => {
      const booking = await this.bookingModel.findByPk(bookingId, {
        lock: Transaction.LOCK.UPDATE,
        transaction: t,
        include: [{ model: BookedSeat }],
      });

      if (!booking) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      }

      this.assertOwnerOrAdmin(booking, user);

      if ([BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)) {
        throw new BadRequestException({
          code: 'BOOKING_ALREADY_CANCELLED',
          message: 'Booking is already cancelled or expired',
        });
      }

      const seatInventoryIds = booking.bookedSeats.map((bs) => bs.seatInventoryId);

      await this.seatInventoryModel.update(
        { status: SeatInventoryStatus.AVAILABLE, heldUntil: null },
        { where: { id: { [Op.in]: seatInventoryIds } }, transaction: t },
      );

      if (booking.status === BookingStatus.CONFIRMED) {
        await this.paymentModel.update(
          { status: PaymentStatus.REFUNDED },
          { where: { bookingId: booking.id }, transaction: t },
        );
      }

      await booking.update({ status: BookingStatus.CANCELLED }, { transaction: t });

      return booking;
    });
  }

  async findMine(
    user: User,
    query: BookingQueryDto,
  ): Promise<{ rows: Booking[]; count: number }> {
    const { page = 1, limit = 10 } = query;
    return this.bookingModel.findAndCountAll({
      where: { userId: user.id },
      include: this.defaultIncludes(),
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
  }

  async findOne(bookingId: string, user: User): Promise<Booking> {
    const booking = await this.findOneById(bookingId);

    if (user.role !== UserRole.ADMIN && booking.userId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You cannot access this booking' });
    }

    return booking;
  }

  async findAll(query: BookingQueryDto): Promise<{ rows: Booking[]; count: number }> {
    const { showtimeId, status, dateFrom, dateTo, page = 1, limit = 10 } = query;
    const where: WhereOptions<Booking> = {};

    if (showtimeId) where['showtimeId'] = showtimeId;
    if (status) where['status'] = status;
    if (dateFrom || dateTo) {
      where['createdAt'] = {
        ...(dateFrom ? { [Op.gte]: new Date(dateFrom) } : {}),
        ...(dateTo ? { [Op.lte]: new Date(dateTo) } : {}),
      };
    }

    return this.bookingModel.findAndCountAll({
      where,
      include: this.defaultIncludes(),
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
  }

  async expireStaleHolds(): Promise<void> {
    const now = new Date();

    await this.sequelize.transaction(async (t: Transaction) => {
      const expiredInventory = await this.seatInventoryModel.findAll({
        where: {
          status: SeatInventoryStatus.HELD,
          heldUntil: { [Op.lt]: now },
        },
        transaction: t,
      });

      if (expiredInventory.length === 0) return;

      const expiredIds = expiredInventory.map((s) => s.id);

      await this.seatInventoryModel.update(
        { status: SeatInventoryStatus.AVAILABLE, heldUntil: null },
        { where: { id: { [Op.in]: expiredIds } }, transaction: t },
      );

      const bookedSeats = await this.bookedSeatModel.findAll({
        where: { seatInventoryId: { [Op.in]: expiredIds } },
        transaction: t,
      });

      const bookingIds = [...new Set(bookedSeats.map((bs) => bs.bookingId))];

      if (bookingIds.length > 0) {
        await this.bookingModel.update(
          { status: BookingStatus.EXPIRED },
          {
            where: { id: { [Op.in]: bookingIds }, status: BookingStatus.PENDING },
            transaction: t,
          },
        );
      }
    });
  }

  private async findOneById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingModel.findByPk(bookingId, {
      include: this.defaultIncludes(),
    });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    return booking;
  }

  private assertOwnerOrAdmin(booking: Booking, user: User): void {
    if (user.role !== UserRole.ADMIN && booking.userId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You cannot modify this booking' });
    }
  }

  private defaultIncludes() {
    return [
      {
        model: Showtime,
        include: [
          { model: Movie, attributes: ['id', 'title'] },
          { model: Screen, attributes: ['id', 'name'] },
        ],
      },
      {
        model: BookedSeat,
        include: [
          {
            model: SeatInventory,
            include: [{ model: Seat, attributes: ['id', 'seatNumber', 'row', 'seatType'] }],
          },
        ],
      },
      { model: Payment },
    ];
  }
}
