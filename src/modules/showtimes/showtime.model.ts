import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { Movie } from '../movies/movie.model';
import { Screen } from '../screens/screen.model';
import { SeatInventory } from './seat-inventory.model';
import { Booking } from '../bookings/booking.model';

@Table({ tableName: 'showtimes', timestamps: true })
export class Showtime extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Movie)
  @Column({ type: DataType.UUID, allowNull: false })
  declare movieId: string;

  @ForeignKey(() => Screen)
  @Column({ type: DataType.UUID, allowNull: false })
  declare screenId: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare startsAt: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare endsAt: Date;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare basePrice: number;

  @BelongsTo(() => Movie)
  declare movie: Movie;

  @BelongsTo(() => Screen)
  declare screen: Screen;

  @HasMany(() => SeatInventory)
  declare seatInventory: SeatInventory[];

  @HasMany(() => Booking)
  declare bookings: Booking[];
}
