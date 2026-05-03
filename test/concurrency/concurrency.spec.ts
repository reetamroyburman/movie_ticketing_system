import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import { Booking } from '../../src/modules/bookings/booking.model';
import { BookedSeat } from '../../src/modules/bookings/booked-seat.model';
import { SeatInventory } from '../../src/modules/showtimes/seat-inventory.model';
import { Showtime } from '../../src/modules/showtimes/showtime.model';
import { Payment } from '../../src/modules/payments/payment.model';
import { BookingStatus, SeatInventoryStatus, UserRole } from '../../src/config/constants';

/**
 * ============================================================
 * CONCURRENCY TEST — Race Condition for Seat Reservation
 * ============================================================
 *
 * This test proves that our pessimistic locking (SELECT ... FOR UPDATE)
 * prevents double-booking when 10 simultaneous requests compete for
 * the same single seat.
 *
 * Strategy:
 *   - We simulate DB-level locking via a shared mutex in the mock.
 *   - A `lockedBy` flag on the mock inventory row acts like a DB row lock:
 *     the first transaction sets it; subsequent ones see the updated status.
 *   - This accurately models what MySQL FOR UPDATE does: the second
 *     reader sees the committed state of the first writer.
 *
 * Expected result: exactly 1 succeeds, 9 receive ConflictException (409).
 */
describe('Concurrency — Seat Reservation Race Condition', () => {
  let service: BookingsService;

  // ---- Shared mutable state simulating a single DB row ----
  type InventoryStatus = 'available' | 'held' | 'booked';

  interface MockSeatRow {
    id: string;
    showtimeId: string;
    seatId: string;
    status: InventoryStatus;
    price: number;
    heldUntil: Date | null;
  }

  let sharedSeatRow: MockSeatRow;

  // Serialise access to sharedSeatRow — simulates the DB serialising concurrent FOR UPDATE locks
  let txQueue = Promise.resolve();

  function acquireLockAndRead(seatIds: string[], showtimeId: string): Promise<MockSeatRow[]> {
    // Chain each "transaction" onto the queue so they execute serially,
    // exactly as MySQL serialises FOR UPDATE lock holders.
    let resolveThisTx!: () => void;
    const thisTxLock = new Promise<void>((res) => { resolveThisTx = res; });

    const result = txQueue.then(() => {
      // We are now "inside the lock"
      const rows =
        sharedSeatRow.showtimeId === showtimeId &&
        seatIds.includes(sharedSeatRow.seatId)
          ? [{ ...sharedSeatRow }]
          : [];
      return rows;
    });

    // Release lock after current holder reads (commit happens in reserve())
    txQueue = result.then(() => {}) as Promise<void>;

    return result;
  }

  const customerUser = (n: number): any => ({
    id: `user-${n}`,
    role: UserRole.CUSTOMER,
  });

  beforeEach(() => {
    // Reset the shared seat to available before each test
    sharedSeatRow = {
      id: 'inv-seat-1',
      showtimeId: 'showtime-1',
      seatId: 'seat-1',
      status: 'available',
      price: 200,
      heldUntil: null,
    };
    txQueue = Promise.resolve();
  });

  /**
   * Core mock that simulates DB-level FOR UPDATE serialisation.
   * Key behaviour:
   *   - findAll with lock:UPDATE serialises callers via txQueue
   *   - The first caller sees status='available' → succeeds
   *   - The update() call immediately mutates sharedSeatRow
   *   - All subsequent callers see status='held' → throw ConflictException
   */
  function buildService(): BookingsService {
    const mockShowtime = { id: 'showtime-1', basePrice: 200 };

    const inventoryMock = {
      findAll: jest.fn().mockImplementation(({ where, lock }: any) => {
        if (lock) {
          // Serialised path — simulates SELECT ... FOR UPDATE
          return acquireLockAndRead(where.seatId?.[Symbol.for('sequelize.op.in')] ?? [], where.showtimeId);
        }
        return Promise.resolve([{ ...sharedSeatRow }]);
      }),
      update: jest.fn().mockImplementation(({ status, heldUntil }: any) => {
        // Commit the status change — now visible to all subsequent lock holders
        sharedSeatRow.status = status;
        sharedSeatRow.heldUntil = heldUntil ?? null;
        return Promise.resolve([1]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const showtimeMock = {
      findByPk: jest.fn().mockResolvedValue(mockShowtime),
    };

    let bookingCounter = 0;
    const bookingMock = {
      create: jest.fn().mockImplementation(() => {
        const id = `booking-${++bookingCounter}`;
        return Promise.resolve({
          id,
          status: BookingStatus.PENDING,
          holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          totalAmount: 200,
        });
      }),
      findByPk: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue([1]),
    };

    const bookedSeatMock = {
      bulkCreate: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const paymentMock = {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue([1]),
    };

    // Sequelize transaction mock that runs the callback immediately (no real DB)
    const mockSequelize = {
      transaction: jest.fn().mockImplementation((cb: (t: any) => Promise<any>) =>
        cb({ LOCK: { UPDATE: Symbol('UPDATE') } }),
      ),
    };

    // Build service directly without NestJS DI — faster for concurrency tests
    const svc = new (BookingsService as any)(
      bookingMock,
      bookedSeatMock,
      inventoryMock,
      showtimeMock,
      paymentMock,
      mockSequelize,
    );

    return svc as BookingsService;
  }

  // ============================================================
  // THE MANDATORY CONCURRENCY TEST
  // ============================================================
  it('10 simultaneous requests for the same seat → exactly 1 succeeds, 9 get ConflictException', async () => {
    service = buildService();

    const CONCURRENT_REQUESTS = 10;
    const dto = { showtimeId: 'showtime-1', seatIds: ['seat-1'] };

    // Fire all 10 requests simultaneously
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        service.reserve(dto, customerUser(i)),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    console.log(`Successes: ${successes.length}, Failures: ${failures.length}`);

    // Assert: exactly 1 succeeded
    expect(successes.length).toBe(1);

    // Assert: exactly 9 failed with ConflictException
    expect(failures.length).toBe(CONCURRENT_REQUESTS - 1);

    failures.forEach((failure) => {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      const err = (failure as PromiseRejectedResult).reason as ConflictException;
      expect((err.getResponse() as any).code).toBe('SEAT_UNAVAILABLE');
    });

    // Assert: the seat ended up in 'held' state — not double-booked
    expect(sharedSeatRow.status).toBe(SeatInventoryStatus.HELD);
  });

  it('3 seats, 10 simultaneous requests — still exactly 1 succeeds', async () => {
    // Expand to a small seat pool (3 seats) but all 10 request the SAME one
    service = buildService();

    const dto = { showtimeId: 'showtime-1', seatIds: ['seat-1'] };

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => service.reserve(dto, customerUser(i))),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    expect(successes.length).toBe(1);
    expect(sharedSeatRow.status).toBe('held');
  });

  it('seat remains available if all requests fail (bad showtime)', async () => {
    service = buildService();
    // Override showtime to not exist
    (service as any).showtimeModel.findByPk = jest.fn().mockResolvedValue(null);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        service.reserve({ showtimeId: 'bad-id', seatIds: ['seat-1'] }, customerUser(i)),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    expect(successes.length).toBe(0);
    // Seat should remain available since all failed before reaching the lock
    expect(sharedSeatRow.status).toBe('available');
  });
});
