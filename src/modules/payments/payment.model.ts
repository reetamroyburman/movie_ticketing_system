import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { PaymentStatus } from '../../config/constants';
import { Booking } from '../bookings/booking.model';

@Table({ tableName: 'payments', timestamps: true })
export class Payment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Booking)
  @Column({ type: DataType.UUID, allowNull: false })
  declare bookingId: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    defaultValue: PaymentStatus.PENDING,
  })
  declare status: PaymentStatus;

  @Column({ type: DataType.STRING })
  declare paymentMethod: string;

  @Column({ type: DataType.STRING })
  declare cardLastFour: string | null;

  @Column({ type: DataType.STRING })
  declare transactionId: string;

  @BelongsTo(() => Booking)
  declare booking: Booking;
}
