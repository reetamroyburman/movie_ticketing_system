import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Showtime } from './showtime.model';
import { SeatInventory } from './seat-inventory.model';
import { Seat } from '../screens/seat.model';
import { Screen } from '../screens/screen.model';
import { Movie } from '../movies/movie.model';
import { CreateShowtimeDto, ShowtimeQueryDto } from './showtime.dto';
import { SEAT_PRICE_MULTIPLIERS, SeatInventoryStatus } from '../../config/constants';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectModel(Showtime) private showtimeModel: typeof Showtime,
    @InjectModel(SeatInventory) private seatInventoryModel: typeof SeatInventory,
    @InjectModel(Seat) private seatModel: typeof Seat,
    @InjectModel(Screen) private screenModel: typeof Screen,
    @InjectModel(Movie) private movieModel: typeof Movie,
  ) {}

  async create(dto: CreateShowtimeDto): Promise<Showtime> {
    const movie = await this.movieModel.findOne({ where: { id: dto.movieId, deletedAt: null } });
    if (!movie) throw new NotFoundException({ code: 'MOVIE_NOT_FOUND', message: 'Movie not found' });

    const screen = await this.screenModel.findByPk(dto.screenId, { include: [Seat] });
    if (!screen) throw new NotFoundException({ code: 'SCREEN_NOT_FOUND', message: 'Screen not found' });

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException({ code: 'INVALID_SHOWTIME', message: 'endsAt must be after startsAt' });
    }

    const showtime = await this.showtimeModel.create({
      id: uuidv4(),
      movieId: dto.movieId,
      screenId: dto.screenId,
      startsAt,
      endsAt,
      basePrice: dto.basePrice,
    });

    // Create SeatInventory for every seat in the screen
    const inventoryRows = screen.seats.map((seat) => ({
      id: uuidv4(),
      showtimeId: showtime.id,
      seatId: seat.id,
      status: SeatInventoryStatus.AVAILABLE,
      price: parseFloat((dto.basePrice * SEAT_PRICE_MULTIPLIERS[seat.seatType]).toFixed(2)),
    }));

    await this.seatInventoryModel.bulkCreate(inventoryRows);

    return this.findOne(showtime.id);
  }

  async findAll(query: ShowtimeQueryDto): Promise<{ rows: Showtime[]; count: number }> {
    const { movieId, screenId, date, page = 1, limit = 10 } = query;
    const where: WhereOptions<Showtime> = {};

    if (movieId) where['movieId'] = movieId;
    if (screenId) where['screenId'] = screenId;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where['startsAt'] = { [Op.between]: [start, end] };
    }

    return this.showtimeModel.findAndCountAll({
      where,
      include: [
        { model: Movie, attributes: ['id', 'title', 'posterUrl', 'durationMinutes'] },
        { model: Screen, attributes: ['id', 'name'] },
      ],
      order: [['startsAt', 'ASC']],
      limit,
      offset: (page - 1) * limit,
    });
  }

  async findOne(id: string): Promise<Showtime> {
    const showtime = await this.showtimeModel.findByPk(id, {
      include: [
        { model: Movie },
        { model: Screen },
      ],
    });
    if (!showtime) throw new NotFoundException({ code: 'SHOWTIME_NOT_FOUND', message: 'Showtime not found' });
    return showtime;
  }

  async getSeatMap(showtimeId: string): Promise<SeatInventory[]> {
    await this.findOne(showtimeId); // validates existence

    return this.seatInventoryModel.findAll({
      where: { showtimeId },
      include: [
        {
          model: Seat,
          attributes: ['id', 'seatNumber', 'row', 'seatIndex', 'seatType'],
        },
      ],
      order: [[{ model: Seat, as: 'seat' }, 'row', 'ASC'], [{ model: Seat, as: 'seat' }, 'seatIndex', 'ASC']],
    });
  }
}
