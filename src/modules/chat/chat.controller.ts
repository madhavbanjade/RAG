import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
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

  // Rename Conversation
@UseGuards(ProtectLoginGuard)
@Patch('conversation/:id/rename')
async renameConversation(
  @Param('id') conversationId: string,
  @Req() req,
  @Body()
  body: {
    title: string;
  },
) {
  return this.chatService.renameConversation(
    conversationId,
    req.user.id,
    body.title,
  );
}

@UseGuards(ProtectLoginGuard)
@Get('search')
async searchConversation(
  @Req() req,
  @Query('q') keyword: string,
  @Query('keyword') keywordAlias?: string,
  @Query('query') queryAlias?: string,
  @Query('search') searchAlias?: string,
) {
  const searchTerm = keyword ?? keywordAlias ?? queryAlias ?? searchAlias;
  console.log('Keyword:', searchTerm);

  return this.chatService.searchConverations(
    req.user.id,
    searchTerm,
  );
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
@Get("user")
async getUserConversations(
  @Req() req,
  @Query("page") page = 1,
  @Query("limit") limit = 10,
) {
  return this.chatService.getUserConversations(
    req.user.id,
    Number(page),
    Number(limit),
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


  @UseGuards(ProtectLoginGuard)
@Patch("conversation/:id/archive")
async archiveConversation(
  @Param("id") conversationId: string,
  @Req() req,
) {
  return this.chatService.archiveConversation(
    conversationId,
    req.user.id,
  );
}

@UseGuards(ProtectLoginGuard)
@Patch("conversation/:id/unarchive")
async unarchiveConversation(
  @Param("id") conversationId: string,
  @Req() req,
) {
  return this.chatService.unarchiveConversation(
    conversationId,
    req.user.id,
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


  @Post('conversation/:id/message')
  @UseGuards(ProtectLoginGuard)
  async sendMessage(
    @Param() params,
    @Param('id') conversationId: string,
    @Req() req,

    @Body()
    body:{
      message: string
    }
    
  ){
     console.log('params:', params);
  console.log('conversationId:', conversationId);
  
    return this.chatService.sendMessage(
      conversationId,
      req.user.id,
      body.message
    )
  }









}



//should add failed resoponse also or null respoonse
//errorhandler
