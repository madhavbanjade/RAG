import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { ChunkingController } from './chunking.controller';

@Module({
  controllers: [ChunkingController],
  providers: [ChunkingService],
})
export class ChunkingModule {}
