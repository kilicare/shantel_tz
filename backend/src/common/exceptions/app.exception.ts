export class AppException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: any,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppException.prototype);
  }
}

export class BadRequestException extends AppException {
  constructor(message: string, code?: string, details?: any) {
    super(400, message, code, details);
    Object.setPrototypeOf(this, BadRequestException.prototype);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(401, message, code);
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

export class ForbiddenException extends AppException {
  constructor(message: string = 'Forbidden', code?: string) {
    super(403, message, code);
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}

export class NotFoundException extends AppException {
  constructor(message: string, code?: string) {
    super(404, message, code);
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, code?: string, details?: any) {
    super(409, message, code, details);
    Object.setPrototypeOf(this, ConflictException.prototype);
  }
}

export class InternalServerException extends AppException {
  constructor(message: string = 'Internal server error', code?: string) {
    super(500, message, code);
    Object.setPrototypeOf(this, InternalServerException.prototype);
  }
}