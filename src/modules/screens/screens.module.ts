import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { Screen } from './screen.model';
import { Seat } from './seat.model';

@Module({
  imports: [SequelizeModule.forFeature([Screen, Seat])],
  controllers: [ScreensController],
  providers: [ScreensService],
  exports: [ScreensService, SequelizeModule],
})
export class ScreensModule {}
