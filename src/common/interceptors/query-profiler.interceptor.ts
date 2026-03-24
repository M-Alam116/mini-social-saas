import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SLOW_QUERY_THRESHOLD_MS = 200;

@Injectable()
export class QueryProfilerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('QueryProfiler');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
          this.logger.warn(
            `🐢 SLOW REQUEST [${duration}ms]: ${method} ${url} — consider optimizing`,
          );
        } else {
          this.logger.log(`✅ [${duration}ms]: ${method} ${url}`);
        }
      }),
    );
  }
}
