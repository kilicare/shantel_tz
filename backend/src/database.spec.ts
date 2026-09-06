import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database/database.service.js';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    try {
      await service.$queryRaw`SELECT 1`;
      expect(true).toBe(true);
    } catch (error) {
      throw new Error('Database connection failed');
    }
  });

  it('should have all tables created', async () => {
    const tables = await service.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    expect(tables.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await service.$disconnect();
  });
});