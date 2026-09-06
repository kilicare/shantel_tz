import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { WinstonLoggerService } from './shared/services/logger.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // Logging
  const logger = new WinstonLoggerService();
  app.useLogger(logger);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SHANTEL SALES & STORE SYSTEM')
    .setDescription('Complete Sales, Inventory & Purchasing Management System')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  logger.log(`✅ Server running on http://localhost:${port}`);
  logger.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
