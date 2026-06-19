import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from './schema/users.schema';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from 'src/common/services/mail/mail.service';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from 'src/common/strategies/google.strategy';
import { RedisService } from 'src/common/services/redis.service';
import { RateLimitService } from 'src/common/services/rate-limit.service';

@Module({
  imports:[
    PassportModule,
    MongooseModule.forFeature([
      {
        name: "User",
        schema: userSchema
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("jwtAccessSecret"),
        signOptions: {expiresIn: '7d'}
      }),
      inject:[ConfigService]
    })
  ],
  controllers: [UsersController],
  providers: [UsersService, BcryptService, MailService, GoogleStrategy, RedisService, RateLimitService],
  exports: [RedisService],
})
export class UsersModule {}
