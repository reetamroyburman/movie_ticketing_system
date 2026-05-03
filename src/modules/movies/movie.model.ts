import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { MovieRating } from '../../config/constants';
import { Showtime } from '../showtimes/showtime.model';

@Table({ tableName: 'movies', timestamps: true, paranoid: true })
export class Movie extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT })
  declare description: string;

  @Column({ type: DataType.STRING })
  declare genre: string;

  @Column({ type: DataType.STRING })
  declare language: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare durationMinutes: number;

  @Column({
    type: DataType.ENUM(...Object.values(MovieRating)),
    allowNull: false,
  })
  declare rating: MovieRating;

  @Column({ type: DataType.DATEONLY })
  declare releaseDate: string;

  @Column({ type: DataType.STRING })
  declare posterUrl: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  declare isActive: boolean;

  @Column({ type: DataType.DATE })
  declare deletedAt: Date;

  @HasMany(() => Showtime)
  declare showtimes: Showtime[];
}
