import { forwardRef, Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { VectorStoreController } from './vector-store.controller';
import { EmbeddingModule } from '../embeddings/embeddings.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [forwardRef(() => EmbeddingModule)],
  controllers: [VectorStoreController],
  providers: [VectorStoreService, JwtService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
