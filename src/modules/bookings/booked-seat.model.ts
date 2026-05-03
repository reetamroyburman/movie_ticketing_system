import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Booking } from './booking.model';
import { SeatInventory } from '../showtimes/seat-inventory.model';

@Table({
  tableName: 'booked_seats',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['bookingId', 'seatInventoryId'],
    },
  ],
})
export class BookedSeat extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Booking)
  @Column({ type: DataType.UUID, allowNull: false })
  declare bookingId: string;

  @ForeignKey(() => SeatInventory)
  @Column({ type: DataType.UUID, allowNull: false })
  declare seatInventoryId: string;

  @BelongsTo(() => Booking)
  declare booking: Booking;

  @BelongsTo(() => SeatInventory)
  declare seatInventory: SeatInventory;
}
