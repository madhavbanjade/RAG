import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { conversationSchema } from './schema/conversation.schema';
import { messageSchema } from './schema/message.schema';
import { EmbeddingModule } from '../embeddings/embeddings.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { LlmService } from 'src/common/services/llm.service';
import { chunkSchema } from '../chunking/schema/chunk.schema';
import { documentSchema } from '../documents/schema/documents.schema';
import { RerankService } from 'src/common/services/rerank.service';
import { RedisService } from 'src/common/services/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Conversation', schema: conversationSchema },
      { name: 'Message', schema: messageSchema },
      { name: 'Chunk', schema: chunkSchema },
      { name: 'Document', schema: documentSchema },
    ]),
    EmbeddingModule,
    VectorStoreModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, JwtService, LlmService, RerankService, RedisService],
})
export class ChatModule {}
