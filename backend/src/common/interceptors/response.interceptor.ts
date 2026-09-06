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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        const formattedResponse = {
          success: true,
          statusCode,
          data: data || null,
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