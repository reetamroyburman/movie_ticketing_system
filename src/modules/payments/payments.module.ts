import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Payment } from './payment.model';

@Module({
  imports: [SequelizeModule.forFeature([Payment])],
  exports: [SequelizeModule],
})
export class PaymentsModule {}
