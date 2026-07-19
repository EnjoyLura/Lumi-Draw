import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorBody {
  message?: string | string[];
  code?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? (exception.getResponse() as ErrorBody | string) : undefined;
    const internalMessage = this.resolveMessage(body, exception);
    const message = status >= 500 ? "服务暂时不可用，请稍后重试" : internalMessage;
    const code = this.resolveCode(status, body);

    if (status >= 500) {
      this.logger.error(internalMessage, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      code,
      message,
      data: null,
      requestId: request.headers["x-request-id"]
    });
  }

  private resolveMessage(body: ErrorBody | string | undefined, exception: unknown) {
    if (typeof body === "string") return body;
    if (Array.isArray(body?.message)) return body.message.join("; ");
    if (body?.message) return body.message;
    if (exception instanceof Error) return exception.message;
    return "服务内部错误";
  }

  private resolveCode(status: number, body: ErrorBody | string | undefined) {
    if (typeof body !== "string" && typeof body?.code === "number") return body.code;
    if (status === HttpStatus.UNAUTHORIZED) return 40001;
    if (status === HttpStatus.FORBIDDEN) return 40003;
    if (status === HttpStatus.NOT_FOUND) return 40004;
    if (status >= 500) return 50000;
    return 40000;
  }
}
