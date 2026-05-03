import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { SeatInventoryStatus } from '../../config/constants';
import { Showtime } from './showtime.model';
import { Seat } from '../screens/seat.model';
import { BookedSeat } from '../bookings/booked-seat.model';

@Table({ tableName: 'seat_inventory', timestamps: true })
export class SeatInventory extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Showtime)
  @Column({ type: DataType.UUID, allowNull: false })
  declare showtimeId: string;

  @ForeignKey(() => Seat)
  @Column({ type: DataType.UUID, allowNull: false })
  declare seatId: string;

  @Column({
    type: DataType.ENUM(...Object.values(SeatInventoryStatus)),
    defaultValue: SeatInventoryStatus.AVAILABLE,
    allowNull: false,
  })
  declare status: SeatInventoryStatus;

  @Column({ type: DataType.DATE })
  declare heldUntil: Date | null;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare price: number;

  @BelongsTo(() => Showtime)
  declare showtime: Showtime;

  @BelongsTo(() => Seat)
  declare seat: Seat;

  @HasMany(() => BookedSeat)
  declare bookedSeats: BookedSeat[];
}
