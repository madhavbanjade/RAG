import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("REDIS_HOST") || "localhost";
    const port = this.configService.get<number>("REDIS_PORT") || 6379;
    const password = this.configService.get<string>("REDIS_PASSWORD");

    this.redis = createClient({
      socket: {
        host,
        port,
      },
      password: password || undefined,
    });

    this.redis.on("error", (err) => this.logger.error("Redis Error:", err));
    this.redis.on("connect", () => this.logger.log("Redis Connected"));
  }


  //while redis running
  async onModuleInit() {
    try {
      await this.redis.connect();
      this.logger.log("Connected to Redis ✓");
    } catch (error) {
      this.logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  //when app stops
  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log("Redis disconnected");
    } catch (error) {
      this.logger.error("Error disconnecting Redis:", error);
    }
  }


  //get the key from the redis  usful for caching
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  //set the key to redis useful for caching
  async set(
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setEx(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }


  //increment the value by 1 useful for rate-limiting
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }


  //decrement the number by 1 useful for rate limiting 
  async decr(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error);
      throw error;
    }
  }

  //delete the key 
  async del(key: string): Promise<number> {
    try {
      return await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  //expire time for the key
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error expiring key ${key}:`, error);
      throw error;
    }
  }


  //check if the key is exists or not
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking key existence ${key}:`, error);
      return false;
    }
  }

  //get time to live for a key
  async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        return 0;
      }
      return ttl;
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return 0;
    }
  }

  //delete everything from redies only for development.
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushAll();
      this.logger.log("Redis flushed");
    } catch (error) {
      this.logger.error("Error flushing Redis:", error);
      throw error;
    }
  }
}