import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { conversationSchema } from './schema/conversation.schema';
import { messageSchema } from './schema/message.schema';

@Module({
  imports:[
MongooseModule.forFeature([
  {
    name: 'Conversation',
    schema: conversationSchema
  },
  {
    name: 'Message',
    schema: messageSchema
  }
])
  ],
  controllers: [ChatController],
  providers: [ChatService, JwtService],
})
export class ChatModule {}
