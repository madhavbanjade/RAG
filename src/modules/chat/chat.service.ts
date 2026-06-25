import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './schema/conversation.schema';
import { Message } from './schema/message.schema';
import mongoose from 'mongoose';
import { ErrorHandler } from 'src/common/handlers/error-handlers';
import { SuccessResponseHandler } from 'src/common/handlers/success-handlers';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<Conversation>,
    @InjectModel('Message')
    private readonly messageModel: Model<Message>,
  )  {}

  //create conversation
  async createConversation(userId: string, title = 'New Chat') {
    const conversation = await this.conversationModel.create({
      userId,
      title,
    });

    if (!conversation) {
      throw ErrorHandler.notFound(conversation);
    }

    return SuccessResponseHandler.created('Conversation', conversation);
  }

  //get conversation
  async getConversation(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw ErrorHandler.notFound('conversation');
    }

    return SuccessResponseHandler.retrived('Conversation', conversation);
  }

  //save message
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ) {
    const message = await this.messageModel.create({
      conversationId,
      role,
      content,
    });

    if (!message) {
      throw ErrorHandler.notFound('Message');
    }

    return SuccessResponseHandler.saved('Message', message);
  }

  //get chat history
  async getChatHistory(conversationId: string, limit: 20) {
    const chat = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit);

    if (!chat) {
      throw ErrorHandler.notFound('Chat Hisotry');
    }

    return SuccessResponseHandler.retrived('Chat History', chat);
  }

  //getall
  async getUserConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({
        userId: new mongoose.Types.ObjectId(userId),
      })
      .sort({
        updatedAt: -1,
      });

    if (!conversations) {
      throw ErrorHandler.notFound('conversations');
    }

    return SuccessResponseHandler.retrived('Conversation', conversations);
  }

  // Delete Conversation
  async deleteConversation(conversationId: string) {
    const message = await this.messageModel.deleteMany({
      conversationId,
    });

    const conversation =
      await this.conversationModel.findByIdAndDelete(conversationId);

    if (message || conversation) {
      throw ErrorHandler.notFound('Messages in the conversation');
    }

    return SuccessResponseHandler.deleted('mesage & convesation');
  }
}
