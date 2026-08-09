import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Parse clean error message
    let message = 'Internal server error';
    let originalMessage: any = null;
    
    if (typeof responseBody === 'string') {
      message = responseBody;
      originalMessage = responseBody;
    } else if (typeof responseBody === 'object' && responseBody !== null) {
      originalMessage = (responseBody as any).message || (responseBody as any).error;
      
      if (Array.isArray(originalMessage)) {
        message = originalMessage.join('\n');
      } else if (typeof originalMessage === 'string') {
        message = originalMessage;
      } else {
        message = JSON.stringify(responseBody);
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    // Log error details for server diagnostics
    console.error(`[Exception] ${request.method} ${request.url} - Status: ${status} - Message:`, message);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(exception);
    }

    response.status(status).json(errorResponse);
  }
}
