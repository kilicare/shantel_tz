import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentTemplateService {
  buildPreview(documentType: string, documentId: string, data: Record<string, any> = {}) {
    const normalizedType = documentType.toUpperCase();

    return {
      documentType: normalizedType,
      documentId,
      title: `${normalizedType} Document`,
      generatedAt: new Date().toISOString(),
      company: {
        name: data.companyName ?? 'Shantel Sales & Store',
        address: data.companyAddress ?? 'Dar es Salaam, Tanzania',
        currency: data.currency ?? 'TZS',
      },
      summary: {
        documentNumber: data.documentNumber ?? `${normalizedType}-000001`,
        status: data.status ?? 'DRAFT',
        totalAmount: data.totalAmount ?? 0,
      },
      lines: data.lines ?? [],
      metadata: {
        createdBy: data.createdBy ?? 'System',
        notes: data.notes ?? '',
      },
    };
  }
}
