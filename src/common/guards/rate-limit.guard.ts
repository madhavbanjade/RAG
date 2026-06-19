import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  identifier?: 'email' | 'ip';
  skipSuccessfulRequests?: boolean;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      const options = this.getRateLimitOptions(context);

      if (!options) {
        return true;
      }

      const identifier = this.getIdentifier(request, options);
      const endpoint = this.getEndpoint(request);
      const key = `rateLimit:${endpoint}:${identifier}`;

      this.logger.debug(
        `Checking rate limit for ${key} (${options.limit}/${options.windowSeconds}s)`,
      );

      const result = await this.rateLimitService.checkAndIncrement(
        key,
        options.limit,
        options.windowSeconds,
      );

      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', result.resetIn);

      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${key}. Remaining: ${result.remaining}`,
        );
        throw new HttpException(
          {
            message: 'Too many requests, please try again later',
            error: 'Rate limit exceeded',
            retryAfter: result.resetIn,
            statusCode: 429,
          },
          429,
        );
      }

      this.logger.debug(
        `Rate limit check passed for ${key}. Remaining: ${result.remaining}`,
      );
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error in rate limit guard:', error);
      return true;
    }
  }

  private getIdentifier(
    request: Request,
    options: RateLimitOptions,
  ): string {
    if (options.identifier === 'ip') {
      return this.getClientIP(request);
    }

    const body = request.body || {};
    const email = body.email || body.loginUserDto?.email;

    if (!email) {
      this.logger.warn('Email not found in request, falling back to IP');
      return this.getClientIP(request);
    }

    return email;
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private getEndpoint(request: Request): string {
    const path = request.path || request.route?.path || 'unknown';
    return path.replace(/\//g, '-').toLowerCase();
  }

  private getRateLimitOptions(context: ExecutionContext): RateLimitOptions | null {
    const handler = context.getHandler();
    return Reflect.getMetadata('rateLimitOptions', handler);
  }
}
