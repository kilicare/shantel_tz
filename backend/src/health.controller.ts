import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private db: DatabaseService) {}

  @Get()
  async health() {
    const dbConnected = await this.db.healthCheck();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
      },
    };
  }
}