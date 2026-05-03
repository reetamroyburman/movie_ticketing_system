import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { SeatType } from '../../config/constants';
import { Screen } from './screen.model';
import { SeatInventory } from '../showtimes/seat-inventory.model';

@Table({ tableName: 'seats', timestamps: true })
export class Seat extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Screen)
  @Column({ type: DataType.UUID, allowNull: false })
  declare screenId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare seatNumber: string; // e.g. A1, B5

  @Column({ type: DataType.STRING, allowNull: false })
  declare row: string; // e.g. A, B

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare seatIndex: number; // 1-based column

  @Column({
    type: DataType.ENUM(...Object.values(SeatType)),
    allowNull: false,
    defaultValue: SeatType.STANDARD,
  })
  declare seatType: SeatType;

  @BelongsTo(() => Screen)
  declare screen: Screen;

  @HasMany(() => SeatInventory)
  declare inventory: SeatInventory[];
}
