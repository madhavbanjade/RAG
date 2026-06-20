import { Module } from '@nestjs/common';
import { ParsersService } from './parsers.service';
import { ParsersController } from './parsers.controller';

@Module({
  controllers: [ParsersController],
  providers: [ParsersService],
})
export class ParsersModule {}
