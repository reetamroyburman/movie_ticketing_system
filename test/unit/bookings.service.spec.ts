/**
 * Unit tests for booking service business logic.
 * DB calls are fully mocked — no database needed.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import { Booking } from '../../src/modules/bookings/booking.model';
import { BookedSeat } from '../../src/modules/bookings/booked-seat.model';
import { SeatInventory } from '../../src/modules/showtimes/seat-inventory.model';
import { Showtime } from '../../src/modules/showtimes/showtime.model';
import { Payment } from '../../src/modules/payments/payment.model';
import { BookingStatus, SeatInventoryStatus, UserRole } from '../../src/config/constants';

const mockSequelize = {
  transaction: jest.fn().mockImplementation((cb: (t: any) => Promise<any>) =>
    cb({ LOCK: { UPDATE: 'UPDATE' } }),
  ),
};

const mockShowtime = { id: 'showtime-1', basePrice: 200 };
const mockInventory = (status: SeatInventoryStatus = SeatInventoryStatus.AVAILABLE) => ({
  id: 'inv-1',
  showtimeId: 'showtime-1',
  seatId: 'seat-1',
  status,
  price: 200,
  heldUntil: null,
});

function makeModelMock() {
  return {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    bulkCreate: jest.fn(),
  };
}

describe('BookingsService (unit)', () => {
  let service: BookingsService;
  let showtimeMock: ReturnType<typeof makeModelMock>;
  let inventoryMock: ReturnType<typeof makeModelMock>;
  let bookingMock: ReturnType<typeof makeModelMock>;
  let bookedSeatMock: ReturnType<typeof makeModelMock>;
  let paymentMock: ReturnType<typeof makeModelMock>;

  const adminUser: any = { id: 'admin-1', role: UserRole.ADMIN };
  const customerUser: any = { id: 'customer-1', role: UserRole.CUSTOMER };

  beforeEach(async () => {
    showtimeMock = makeModelMock();
    inventoryMock = makeModelMock();
    bookingMock = makeModelMock();
    bookedSeatMock = makeModelMock();
    paymentMock = makeModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getModelToken(Booking), useValue: bookingMock },
        { provide: getModelToken(BookedSeat), useValue: bookedSeatMock },
        { provide: getModelToken(SeatInventory), useValue: inventoryMock },
        { provide: getModelToken(Showtime), useValue: showtimeMock },
        { provide: getModelToken(Payment), useValue: paymentMock },
        { provide: 'SEQUELIZE', useValue: mockSequelize },
      ],
    })
      .overrideProvider('SEQUELIZE')
      .useValue(mockSequelize)
      .compile();

    service = module.get<BookingsService>(BookingsService);
    // Inject sequelize directly
    (service as any).sequelize = mockSequelize;
  });

  describe('reserve', () => {
    it('throws NotFoundException when showtime does not exist', async () => {
      showtimeMock.findByPk.mockResolvedValue(null);
      inventoryMock.findAll.mockResolvedValue([mockInventory()]);

      await expect(
        service.reserve({ showtimeId: 'bad-id', seatIds: ['seat-1'] }, customerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException (SEAT_UNAVAILABLE) when seat is already held', async () => {
      showtimeMock.findByPk.mockResolvedValue(mockShowtime);
      inventoryMock.findAll.mockResolvedValue([mockInventory(SeatInventoryStatus.HELD)]);

      await expect(
        service.reserve({ showtimeId: 'showtime-1', seatIds: ['seat-1'] }, customerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when seat is already booked', async () => {
      showtimeMock.findByPk.mockResolvedValue(mockShowtime);
      inventoryMock.findAll.mockResolvedValue([mockInventory(SeatInventoryStatus.BOOKED)]);

      await expect(
        service.reserve({ showtimeId: 'showtime-1', seatIds: ['seat-1'] }, customerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when seatIds do not belong to showtime', async () => {
      showtimeMock.findByPk.mockResolvedValue(mockShowtime);
      inventoryMock.findAll.mockResolvedValue([]); // no matching rows found

      await expect(
        service.reserve({ showtimeId: 'showtime-1', seatIds: ['bad-seat'] }, customerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates booking and transitions seat to held on success', async () => {
      showtimeMock.findByPk.mockResolvedValue(mockShowtime);
      inventoryMock.findAll.mockResolvedValue([mockInventory()]);
      inventoryMock.update.mockResolvedValue([1]);
      bookingMock.create.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        totalAmount: 200,
      });
      bookedSeatMock.bulkCreate.mockResolvedValue([]);

      const booking = await service.reserve(
        { showtimeId: 'showtime-1', seatIds: ['seat-1'] },
        customerUser,
      );

      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(inventoryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: SeatInventoryStatus.HELD }),
        expect.anything(),
      );
    });
  });

  describe('cancel', () => {
    it('throws NotFoundException when booking does not exist', async () => {
      bookingMock.findByPk.mockResolvedValue(null);

      await expect(service.cancel('bad-id', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when booking is already cancelled', async () => {
      bookingMock.findByPk.mockResolvedValue({
        id: 'booking-1',
        userId: 'customer-1',
        status: BookingStatus.CANCELLED,
        bookedSeats: [],
        update: jest.fn(),
      });

      await expect(service.cancel('booking-1', customerUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('expireStaleHolds', () => {
    it('reverts held seats and marks bookings as expired', async () => {
      const expiredInv = [{ id: 'inv-expired-1' }, { id: 'inv-expired-2' }];
      inventoryMock.findAll.mockResolvedValue(expiredInv);
      inventoryMock.update.mockResolvedValue([2]);
      bookedSeatMock.findAll.mockResolvedValue([
        { seatInventoryId: 'inv-expired-1', bookingId: 'booking-1' },
      ]);
      bookingMock.update.mockResolvedValue([1]);

      await expect(service.expireStaleHolds()).resolves.not.toThrow();

      expect(inventoryMock.update).toHaveBeenCalledWith(
        { status: SeatInventoryStatus.AVAILABLE, heldUntil: null },
        expect.anything(),
      );
      expect(bookingMock.update).toHaveBeenCalledWith(
        { status: BookingStatus.EXPIRED },
        expect.anything(),
      );
    });

    it('does nothing when no expired holds exist', async () => {
      inventoryMock.findAll.mockResolvedValue([]);

      await expect(service.expireStaleHolds()).resolves.not.toThrow();
      expect(inventoryMock.update).not.toHaveBeenCalled();
    });
  });
});
