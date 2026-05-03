import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors();

  // Rate limiting — auth routes: 10/15min, booking routes: 20/min, global: 100/min
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many auth requests, please try again later.',
          details: [],
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/api/bookings',
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many booking requests, please slow down.',
          details: [],
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please slow down.',
          details: [],
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Movie Ticketing API')
    .setDescription(
      'RESTful API for a Movie Ticketing System. Admins manage movies, screens, and showtimes. Customers browse, reserve seats, and book tickets.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Registration, login, token refresh, logout')
    .addTag('Movies', 'Movie management and browsing')
    .addTag('Screens', 'Screen and seat layout management')
    .addTag('Showtimes', 'Showtime scheduling and seat availability')
    .addTag('Bookings', 'Seat reservation and booking lifecycle')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🎬 Movie Ticketing API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
