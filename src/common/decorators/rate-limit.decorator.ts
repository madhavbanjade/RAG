import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  identifier?: 'email' | 'ip';
}

export const RateLimit = (config: RateLimitConfig) => {
  return SetMetadata('rateLimitOptions', config);
};

export const LoginRateLimit = () =>
  RateLimit({
    limit: 5,
    windowSeconds: 900, // 15 minutes
    identifier: 'email',
  });

export const RegisterRateLimit = () =>
  RateLimit({
    limit: 3,
    windowSeconds: 3600, // 1 hour
    identifier: 'ip',
  });

export const ForgotPasswordRateLimit = () =>
  RateLimit({
    limit: 3,
    windowSeconds: 600, // 10 minutes
    identifier: 'email',
  });

export const VerifyEmailRateLimit = () =>
  RateLimit({
    limit: 5,
    windowSeconds: 600, // 10 minutes
    identifier: 'email',
  });

export const ResetPasswordRateLimit = () =>
  RateLimit({
    limit: 3,
    windowSeconds: 900, // 15 minutes
    identifier: 'email',
  });
