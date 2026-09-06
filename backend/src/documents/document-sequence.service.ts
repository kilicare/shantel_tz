import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DocumentSequenceService {
  private readonly logger = new Logger(DocumentSequenceService.name);

  private readonly defaultPrefixes: Record<string, string> = {
    QUOTATION: 'QT',
    SALES_ORDER: 'SO',
    INVOICE: 'INV',
    PAYMENT: 'PAY',
    RECEIPT: 'RCP',
    SALES_RETURN: 'SR',
    REQUISITION: 'REQ',
    PURCHASE_ORDER: 'PO',
    GRN: 'GRN',
    PURCHASE_RETURN: 'PR',
    STOCK_TRANSFER: 'TRF',
    STOCK_ADJUSTMENT: 'ADJ',
    STOCK_AUDIT: 'AUD',
    EXPENSE: 'EXP',
    PROJECT: 'PRJ',
    ASSET: 'ASS',
    REFUND: 'RFD',
    SUPPLIER_PAYMENT: 'SP',
  };

  constructor(private readonly db: DatabaseService) {}

  private normalizeDocumentType(documentType: string) {
    const normalized = documentType?.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Document type is required');
    }

    return normalized;
  }

  private normalizePadding(padding: number) {
    const value = Number.isFinite(padding) ? Math.trunc(padding) : 6;

    if (value < 1 || value > 12) {
      return 6;
    }

    return value;
  }

  private normalizePrefix(prefix: string | undefined, documentType: string) {
    const normalized = (prefix ?? this.defaultPrefixes[documentType] ?? 'DOC')
      .trim()
      .toUpperCase();

    if (!normalized || normalized.length > 10) {
      throw new BadRequestException('Prefix must be 1-10 characters');
    }

    return normalized;
  }

  async getNextNumber(documentType: string): Promise<string> {
    const normalizedType = this.normalizeDocumentType(documentType);
    const currentYear = new Date().getFullYear();

    try {
      const result = await this.db.$transaction(async (tx) => {
        let sequence = await tx.documentSequence.findUnique({
          where: { documentType: normalizedType },
        });

        if (!sequence) {
          sequence = await tx.documentSequence.create({
            data: {
              documentType: normalizedType,
              currentNumber: 1n,
              prefix: this.normalizePrefix(undefined, normalizedType),
              padding: 6,
              year: currentYear,
              status: 'ACTIVE',
            },
          });

          return sequence;
        }

        if (sequence.year !== currentYear) {
          return tx.documentSequence.update({
            where: { documentType: normalizedType },
            data: { currentNumber: 1n, year: currentYear, status: 'ACTIVE' },
          });
        }

        return tx.documentSequence.update({
          where: { documentType: normalizedType },
          data: { currentNumber: { increment: 1n } },
        });
      });

      const formattedNumber = `${result.prefix}-${result.year}-${String(result.currentNumber).padStart(result.padding, '0')}`;
      this.logger.log(`Document number generated: ${formattedNumber}`);
      return formattedNumber;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to generate document number: ${error instanceof Error ? error.message : String(error)}`);
      throw new ConflictException('Failed to generate document number');
    }
  }

  async updatePrefix(documentType: string, newPrefix: string) {
    const normalizedType = this.normalizeDocumentType(documentType);
    const prefix = this.normalizePrefix(newPrefix, normalizedType);
    const sequence = await this.db.documentSequence.findUnique({
      where: { documentType: normalizedType },
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence for ${normalizedType} not found`);
    }

    return this.db.documentSequence.update({
      where: { documentType: normalizedType },
      data: { prefix },
    });
  }

  async resetSequence(documentType: string) {
    const normalizedType = this.normalizeDocumentType(documentType);
    const sequence = await this.db.documentSequence.findUnique({
      where: { documentType: normalizedType },
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence for ${normalizedType} not found`);
    }

    return this.db.documentSequence.update({
      where: { documentType: normalizedType },
      data: { currentNumber: 0n, year: new Date().getFullYear() },
    });
  }

  async getAllSequences() {
    return this.db.documentSequence.findMany({ orderBy: { documentType: 'asc' } });
  }

  async getSequence(documentType: string) {
    const normalizedType = this.normalizeDocumentType(documentType);
    const sequence = await this.db.documentSequence.findUnique({
      where: { documentType: normalizedType },
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence for ${normalizedType} not found`);
    }

    return sequence;
  }

  async ensureSequence(documentType: string, prefix?: string, padding = 6) {
    const normalizedType = this.normalizeDocumentType(documentType);
    const effectivePadding = this.normalizePadding(padding);
    const effectivePrefix = this.normalizePrefix(prefix, normalizedType);

    const record = await this.db.documentSequence.upsert({
      where: { documentType: normalizedType },
      create: {
        documentType: normalizedType,
        prefix: effectivePrefix,
        currentNumber: 0n,
        padding: effectivePadding,
        year: new Date().getFullYear(),
        status: 'ACTIVE',
      },
      update: {
        prefix: effectivePrefix,
        padding: effectivePadding,
        status: 'ACTIVE',
      },
    });

    return record;
  }

  async generateNextNumber(documentType: string, prefix?: string, padding = 6) {
    const normalizedType = this.normalizeDocumentType(documentType);
    const effectivePadding = this.normalizePadding(padding);
    const effectivePrefix = this.normalizePrefix(prefix, normalizedType);

    const result = await this.db.$transaction(async (tx) => {
      const existing = await tx.documentSequence.findUnique({
        where: { documentType: normalizedType },
      });

      const currentNumber = Number(existing?.currentNumber ?? 0n);
      const nextNumber = currentNumber + 1;

      const updated = await tx.documentSequence.upsert({
        where: { documentType: normalizedType },
        create: {
          documentType: normalizedType,
          prefix: effectivePrefix,
          currentNumber: BigInt(nextNumber),
          padding: effectivePadding,
          year: new Date().getFullYear(),
          status: 'ACTIVE',
        },
        update: {
          prefix: effectivePrefix,
          currentNumber: BigInt(nextNumber),
          padding: effectivePadding,
          status: 'ACTIVE',
        },
      });

      return {
        nextNumber,
        formattedNumber: `${effectivePrefix}-${String(nextNumber).padStart(effectivePadding, '0')}`,
        sequence: updated,
      };
    });

    this.logger.log(`Generated ${normalizedType} document number ${result.formattedNumber}`);
    return result;
  }
}
