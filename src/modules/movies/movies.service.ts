import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Movie } from './movie.model';
import { CreateMovieDto, UpdateMovieDto, MovieQueryDto } from './movie.dto';

@Injectable()
export class MoviesService {
  constructor(@InjectModel(Movie) private movieModel: typeof Movie) {}

  async create(dto: CreateMovieDto): Promise<Movie> {
    return this.movieModel.create({ id: uuidv4(), ...dto });
  }

  async findAll(query: MovieQueryDto): Promise<{ rows: Movie[]; count: number }> {
    const {
      genre, language, rating, search,
      sortBy = 'releaseDate', sortOrder = 'DESC',
      page = 1, limit = 10,
    } = query;

    const where: WhereOptions = { deletedAt: null };

    if (genre) where['genre'] = genre;
    if (language) where['language'] = language;
    if (rating) where['rating'] = rating;
    if (search) where['title'] = { [Op.like]: `%${search}%` };

    const offset = (page - 1) * limit;

    return this.movieModel.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });
  }

  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieModel.findOne({ where: { id, deletedAt: null } });
    if (!movie) throw new NotFoundException({ code: 'MOVIE_NOT_FOUND', message: 'Movie not found' });
    return movie;
  }

  async update(id: string, dto: UpdateMovieDto): Promise<Movie> {
    const movie = await this.findOne(id);
    await movie.update(dto);
    return movie;
  }

  async softDelete(id: string): Promise<void> {
    const movie = await this.findOne(id);
    await movie.update({ deletedAt: new Date(), isActive: false });
  }
}
