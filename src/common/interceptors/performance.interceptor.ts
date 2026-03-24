import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as os from 'os';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private lastLoopTime = Date.now();
  private eventLoopLag = 0;

  constructor() {
    // Measure Event Loop Lag every 1 second
    setInterval(() => {
      const now = Date.now();
      const delay = now - this.lastLoopTime - 1000;
      this.eventLoopLag = Math.max(0, delay);
      this.lastLoopTime = now;
      
      // Intensive logging for performance investigation
      if (this.eventLoopLag > 50) {
        this.logger.warn(`🚨 EVENT LOOP LAG DETECTED: ${this.eventLoopLag}ms`);
      }
    }, 1000).unref();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
        
        // Log if total time exceeds 200ms
        if (duration > 200) {
          this.logger.log(`⚠️ SLOW REQUEST [${method} ${url}]: ${duration}ms | EventLoopLag: ${this.eventLoopLag}ms | CPU: ${cpuUsage.toFixed(1)}%`);
        }
      }),
    );
  }
}
