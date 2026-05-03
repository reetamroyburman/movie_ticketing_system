import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { Seat } from './seat.model';
import { Showtime } from '../showtimes/showtime.model';

@Table({ tableName: 'screens', timestamps: true })
export class Screen extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare totalSeats: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare rows: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare seatsPerRow: number;

  @HasMany(() => Seat)
  declare seats: Seat[];

  @HasMany(() => Showtime)
  declare showtimes: Showtime[];
}
