import { describe, expect, it, vi } from 'vitest';
import { DataIntegrityService } from './data-integrity.service.js';

describe('DataIntegrityService', () => {
  it('flags invalid document sequencing when a sequence has a blank prefix or negative current number', async () => {
    const db = {
      documentSequence: {
        findMany: vi.fn().mockResolvedValue([
          {
            documentType: 'INVOICE',
            prefix: 'INV',
            currentNumber: 12n,
            padding: 6,
          },
          {
            documentType: 'PAYMENT',
            prefix: '',
            currentNumber: -1n,
            padding: 6,
          },
        ]),
      },
      stockBalance: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const service = new DataIntegrityService(db as any);
    const result = await service.checkDocumentNumbering();

    expect(result.isHealthy).toBe(false);
    expect(result.invalidSequences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentType: 'PAYMENT',
          issue: expect.stringContaining('blank prefix'),
        }),
      ]),
    );
  });
});
