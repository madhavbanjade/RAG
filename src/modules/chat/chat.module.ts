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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Conversation', schema: conversationSchema },
      { name: 'Message', schema: messageSchema },
    ]),
    EmbeddingModule,
    VectorStoreModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, JwtService, LlmService],
})
export class ChatModule {}
