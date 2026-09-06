import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentSequenceService } from './document-sequence.service.js';
import { DocumentTemplateService } from './templates/document-template.service.js';
import { PDFGeneratorService } from './pdf/pdf-generator.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [DocumentSequenceService, DocumentTemplateService, PDFGeneratorService],
  controllers: [DocumentsController],
  exports: [DocumentSequenceService, DocumentTemplateService, PDFGeneratorService],
})
export class DocumentsModule {}
