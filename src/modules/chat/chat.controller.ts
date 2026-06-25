import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ProtectLoginGuard } from 'src/common/guards/auth.guards';
import { RoleProtectGuard } from 'src/common/guards/role-gaurds';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}


  @Post('conversation')
  @UseGuards(ProtectLoginGuard)
  async creatConversation(
   @Req() req,
    @Body() body
  ){
    return this.chatService.createConversation(
      req.user.id,
      body.title
    )
  }

    // Get Conversation
    @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  @Get('conversation/:id')
  async getConversation(
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(id);
  }

  // Get User Conversations
    @UseGuards(ProtectLoginGuard)
  @Get('user/:userId')
  async getUserConversations(
    @Param('userId') userId: string,
  ) {
    return this.chatService.getUserConversations(
      userId,
    );
  }

   // Save Message
    @UseGuards(ProtectLoginGuard)
  @Post('message')
  async saveMessage(
    @Body()
    body: {
      conversationId: string;
      role: 'user' | 'assistant';
      content: string;
    },
  ) {
    return this.chatService.saveMessage(
      body.conversationId,
      body.role,
      body.content,
    );
  }

    @UseGuards(ProtectLoginGuard)
    @Get('history/:conversationId')
  async getHistory(
    @Param('conversationId')
    conversationId: string,
  ) {
    return this.chatService.getChatHistory(
      conversationId,
      20
        );
  }

    // Delete Conversation
    @UseGuards(ProtectLoginGuard)
  @Delete('conversation/:id')
  async deleteConversation(
    @Param('id') id: string,
  ) {
    return this.chatService.deleteConversation(
      id,
    );
  }


}



//should add failed resoponse also or null respoonse
//errorhandler