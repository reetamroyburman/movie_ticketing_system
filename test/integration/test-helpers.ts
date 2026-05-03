import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}

export async function registerAndLogin(
  app: INestApplication,
  email: string,
  password: string,
  name = 'Test User',
): Promise<string> {
  await request(app.getHttpServer()).post('/api/auth/register').send({ name, email, password });

  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  return res.body.data.accessToken as string;
}

export async function makeAdmin(app: INestApplication, email: string): Promise<void> {
  // Directly update via sequelize model — only used in tests
  const sequelize = app.get('SEQUELIZE');
  await sequelize.query(`UPDATE users SET role = 'admin' WHERE email = '${email}'`);
}
