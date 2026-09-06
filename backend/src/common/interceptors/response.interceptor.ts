import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  private serialize(value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    if (Array.isArray(value)) return value.map((item) => this.serialize(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.serialize(item)]),
      );
    }
    return value;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        const formattedResponse = {
          success: true,
          statusCode,
          data: this.serialize(data || null),
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };

        this.logger.debug(`[${request.method}] ${request.url} ${statusCode}`);

        return formattedResponse;
      }),
    );
  }
}