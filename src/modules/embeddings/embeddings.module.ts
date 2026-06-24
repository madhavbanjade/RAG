import { forwardRef, Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { embeddingSceham } from './schema/embeddings.schema';
import { EmbeddingController } from './embeddings.controller';
import { EmbeddingService } from './embeddings.service';
import { chunkSchema } from '../chunking/schema/chunk.schema';
import { VectorStoreModule } from '../vector-store/vector-store.module';


@Module({
  imports:[
    forwardRef(() => VectorStoreModule),
    MongooseModule.forFeature([
      {
        name: "Embedding",
        schema: embeddingSceham
      },
      {
        name: "Chunk",
        schema: chunkSchema
      },
    ])
  ],
  controllers: [EmbeddingController],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
