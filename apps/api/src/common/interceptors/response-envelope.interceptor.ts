import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import type { ApiEnvelope } from "../interfaces/api-envelope";

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const requestId = request.headers["x-request-id"];

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: "ok",
        data,
        ...(requestId ? { requestId } : {})
      }))
    );
  }
}
