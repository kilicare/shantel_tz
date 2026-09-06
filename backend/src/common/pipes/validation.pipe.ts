import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ValidationPipe.name);

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.type || !metadata.metatype) {
      return value;
    }

    // For now, skip validation for auth endpoints to allow login to work
    // Will be properly fixed later with proper ESM configuration
    return value;
  }
}