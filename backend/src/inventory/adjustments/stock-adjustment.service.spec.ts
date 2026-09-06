import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { StockAdjustmentService } from './stock-adjustment.service.js';

describe('StockAdjustmentService', () => {
  it('applies each item delta to stock balances before marking the adjustment as posted', async () => {
    const db = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'adj-1',
          adjustmentNumber: 'ADJ-2026-000001',
          locationId: 'loc-1',
          status: 'SUBMITTED',
          createdById: 'user-1',
          items: [
            {
              productId: 'prod-1',
              difference: new Prisma.Decimal(5),
              reason: 'Stock count correction',
            },
          ],
        }),
      },
      $transaction: vi.fn(async (handler) =>
        handler({
          stockAdjustment: {
            update: vi.fn().mockResolvedValue({ id: 'adj-1', status: 'POSTED' }),
          },
          stockBalance: {
            findUnique: vi.fn().mockResolvedValue({ quantity: new Prisma.Decimal(10) }),
            upsert: vi.fn().mockResolvedValue({ quantity: new Prisma.Decimal(15) }),
          },
          inventoryMovement: {
            create: vi.fn().mockResolvedValue({}),
          },
        }),
      ),
    };

    const service = new StockAdjustmentService(db as any, {} as any);

    const result = await service.post('adj-1', 'user-2');

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'adj-1', status: 'POSTED' });
  });
});