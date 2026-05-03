import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Screen } from './screen.model';
import { Seat } from './seat.model';
import { CreateScreenDto } from './screen.dto';
import { ROW_LABELS, SeatType } from '../../config/constants';

@Injectable()
export class ScreensService {
  constructor(
    @InjectModel(Screen) private screenModel: typeof Screen,
    @InjectModel(Seat) private seatModel: typeof Seat,
  ) {}

  async create(dto: CreateScreenDto): Promise<Screen> {
    const existing = await this.screenModel.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException({ code: 'SCREEN_NAME_TAKEN', message: 'Screen name already exists' });
    }

    const totalSeats = dto.rows * dto.seatsPerRow;

    // Build row -> seatType map
    const rowTypeMap: Record<string, SeatType> = {};
    if (dto.rowTypeConfig) {
      for (const config of dto.rowTypeConfig) {
        rowTypeMap[config.row.toUpperCase()] = config.seatType;
      }
    }

    const screen = await this.screenModel.create({
      id: uuidv4(),
      name: dto.name,
      totalSeats,
      rows: dto.rows,
      seatsPerRow: dto.seatsPerRow,
    });

    // Generate seats
    const seats: Partial<Seat>[] = [];
    for (let r = 0; r < dto.rows; r++) {
      const rowLabel = ROW_LABELS[r];
      const seatType = rowTypeMap[rowLabel] || SeatType.STANDARD;
      for (let s = 1; s <= dto.seatsPerRow; s++) {
        seats.push({
          id: uuidv4(),
          screenId: screen.id,
          seatNumber: `${rowLabel}${s}`,
          row: rowLabel,
          seatIndex: s,
          seatType,
        });
      }
    }

    await this.seatModel.bulkCreate(seats);

    return this.findOne(screen.id);
  }

  async findAll(): Promise<Screen[]> {
    return this.screenModel.findAll();
  }

  async findOne(id: string): Promise<Screen> {
    const screen = await this.screenModel.findByPk(id, {
      include: [{ model: Seat, order: [['row', 'ASC'], ['seatIndex', 'ASC']] }],
    });
    if (!screen) throw new NotFoundException({ code: 'SCREEN_NOT_FOUND', message: 'Screen not found' });
    return screen;
  }
}
