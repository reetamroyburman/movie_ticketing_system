import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { BookingStatus } from '../../config/constants';
import { User } from '../users/user.model';
import { Showtime } from '../showtimes/showtime.model';
import { BookedSeat } from './booked-seat.model';
import { Payment } from '../payments/payment.model';

@Table({ tableName: 'bookings', timestamps: true })
export class Booking extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @ForeignKey(() => Showtime)
  @Column({ type: DataType.UUID, allowNull: false })
  declare showtimeId: string;

  @Column({
    type: DataType.ENUM(...Object.values(BookingStatus)),
    defaultValue: BookingStatus.PENDING,
  })
  declare status: BookingStatus;

  @Column({ type: DataType.DATE })
  declare holdExpiresAt: Date | null;

  @Column({ type: DataType.DECIMAL(10, 2) })
  declare totalAmount: number;

  @Column({ type: DataType.STRING })
  declare bookingReference: string | null;

  @BelongsTo(() => User)
  declare user: User;

  @BelongsTo(() => Showtime)
  declare showtime: Showtime;

  @HasMany(() => BookedSeat)
  declare bookedSeats: BookedSeat[];

  @HasOne(() => Payment)
  declare payment: Payment;
}
