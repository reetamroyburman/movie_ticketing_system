import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/user.model';
import { RefreshToken } from './refresh-token.model';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const existing = await this.userModel.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    }

    const user = await this.userModel.create({
      id: uuidv4(),
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    const tokens = await this.generateTokens(user);
    return { user, ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userModel.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await user.validatePassword(dto.password);
    if (!valid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const tokens = await this.generateTokens(user);
    return { user, ...tokens };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenRecord = await this.refreshTokenModel.findOne({
      where: { token: refreshToken, revoked: false },
      include: [User],
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired' });
    }

    // Rotate: revoke old, issue new
    await tokenRecord.update({ revoked: true });
    const tokens = await this.generateTokens(tokenRecord.user);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenModel.update(
      { revoked: true },
      { where: { token: refreshToken } },
    );
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      id: uuidv4(),
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
