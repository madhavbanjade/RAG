import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redisService: RedisService) {}

  async checkAndIncrement(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      const currentCountStr = await this.redisService.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      const isAllowed = currentCount < limit;

      const newCount = await this.redisService.incr(key);

      if (currentCount === 0) {
        await this.redisService.expire(key, windowSeconds);
      }

      const ttl = await this.getTTL(key);

      return {
        allowed: isAllowed,
        remaining: Math.max(0, limit - newCount),
        resetIn: ttl,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for key ${key}:`, error);
      return {
        allowed: true,
        remaining: limit,
        resetIn: 0,
      };
    }
  }


  //reset after certin time 
  async reset(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for key ${key}:`, error);
    }
  }


  //show remaining attempts
  async getRemainingAttempts(key: string, limit: number): Promise<number> {
    try {
      const countStr = await this.redisService.get(key);
      const count = countStr ? parseInt(countStr, 10) : 0;
      return Math.max(0, limit - count);
    } catch (error) {
      this.logger.error(
        `Error getting remaining attempts for key ${key}:`,
        error,
      );
      return limit;
    }
  }


  //time remainging
  async getTimeUntilReset(key: string): Promise<number> {
    try {
      return await this.getTTL(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return 0;
    }
  }

  //this is the end 
  async isLimited(
    key: string,
    limit: number,
  ): Promise<boolean> {
    try {
      const countStr = await this.redisService.get(key);
      const count = countStr ? parseInt(countStr, 10) : 0;
      return count >= limit;
    } catch (error) {
      this.logger.error(`Error checking if limited for key ${key}:`, error);
      return false;
    }
  }

  //get the time
  private async getTTL(key: string): Promise<number> {
    try {
      return await this.redisService.getTTL(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return 0;
    }
  }

  //reset by email 
  async resetByEmail(email: string): Promise<void> {
    try {
      const keys = [
        `rateLimit:login:${email}`,
        `rateLimit:register:${email}`,
        `rateLimit:forgot-password:${email}`,
        `rateLimit:verify-email:${email}`,
        `rateLimit:reset-password:${email}`,
      ];

      for (const key of keys) {
        await this.redisService.del(key);
      }

      this.logger.log(`All rate limits reset for email: ${email}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limits for email ${email}:`, error);
    }
  }

  //reset by ip for register only
  async resetByIP(ip: string): Promise<void> {
    try {
      const keys = [`rateLimit:register:${ip}`];

      for (const key of keys) {
        await this.redisService.del(key);
      }

      this.logger.log(`All rate limits reset for IP: ${ip}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limits for IP ${ip}:`, error);
    }
  }
}
