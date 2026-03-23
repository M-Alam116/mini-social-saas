import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = exception.message || 'Internal server error';

    // Handle Prisma specific errors
    if (exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'Duplicate field value: unique constraint failed';
    }

    if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found';
    }

    // Standardize validation errors
    const errorResponse = exception.getResponse ? exception.getResponse() : null;
    const body = {
      statusCode: status,
      message: (errorResponse as any)?.message || message,
      error: (errorResponse as any)?.error || this.getErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private getErrorName(status: number): string {
    switch (status) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 429: return 'Too Many Requests';
      case 500: return 'Internal Server Error';
      default: return 'Error';
    }
  }
}
