import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  BeforeCreate,
  BeforeUpdate,
} from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../config/constants';
import { Booking } from '../bookings/booking.model';
import { RefreshToken } from '../auth/refresh-token.model';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: false,
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.CUSTOMER,
  })
  declare role: UserRole;

  @HasMany(() => Booking)
  declare bookings: Booking[];

  @HasMany(() => RefreshToken)
  declare refreshTokens: RefreshToken[];

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User): Promise<void> {
    if (instance.changed('password')) {
      instance.password = await bcrypt.hash(instance.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  toJSON(): object {
    const values = { ...this.get() } as Record<string, unknown>;
    delete values['password'];
    return values;
  }
}
