  import { Module } from '@nestjs/common';
  import { AppController } from './app.controller';
  import { AppService } from './app.service';
  import { ConfigModule } from '@nestjs/config';
  import { DatabaseModule } from './modules/database/database.module';
  import { UsersModule } from './modules/users/users.module';
import { MailService } from './common/services/mail/mail.service';


// hello world
  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      DatabaseModule,
      UsersModule,
    ],
    controllers: [AppController],
    providers: [AppService, MailService],
  })
  export class AppModule {}
