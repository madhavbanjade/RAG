import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './schema/conversation.schema';
import { Message } from './schema/message.schema';
import mongoose from 'mongoose';
import { ErrorHandler } from 'src/common/handlers/error-handlers';
import { SuccessResponseHandler } from 'src/common/handlers/success-handlers';
import { EmbeddingService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { LlmService } from 'src/common/services/llm.service';
import { IChunk } from '../chunking/schema/chunk.schema';
import { IDocument } from '../documents/schema/documents.schema';
import { RerankService } from 'src/common/services/rerank.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<Conversation>,
    @InjectModel('Message')
    private readonly messageModel: Model<Message>,
    @InjectModel('Chunk')
    private readonly chunkModel: Model<IChunk>,
    @InjectModel('Document')
    private readonly documentModel: Model<IDocument>,

    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly rerankService: RerankService
  ) {}

  private async buildSources(chunks: any[]) {
    const missingCitationChunkIds = chunks
      .filter((item) => (!item.documentName || item.page === undefined) && item.chunkId)
      .map((item) => item.chunkId);

    if (!missingCitationChunkIds.length) {
      return chunks.map((item) => ({
        documentName: item.documentName,
        page: item.page,
        score: item.score,
        rerankScore: item.rerankScore,
      }));
    }

    const dbChunks = await this.chunkModel
      .find({ _id: { $in: missingCitationChunkIds } })
      .select('_id documentId metadata')
      .lean();

    const documentIds = [
      ...new Set(dbChunks.map((chunk: any) => chunk.documentId?.toString()).filter(Boolean)),
    ];

    const documents = await this.documentModel
      .find({ _id: { $in: documentIds } })
      .select('_id title files.originalName')
      .lean();

    const chunkById = new Map(
      dbChunks.map((chunk: any) => [chunk._id.toString(), chunk]),
    );
    const documentById = new Map(
      documents.map((document: any) => [document._id.toString(), document]),
    );

    return chunks.map((item) => {
      const dbChunk = item.chunkId ? chunkById.get(item.chunkId) : null;
      const document = dbChunk?.documentId
        ? documentById.get(dbChunk.documentId.toString())
        : null;

      return {
        documentName:
          item.documentName ||
          document?.files?.[0]?.originalName ||
          document?.title,
        page: item.page ?? dbChunk?.metadata?.pageNumber ?? 1,
        score: item.score,
        rerankScore: item.rerankScore,
      };
    });
  }

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

    //rename converstation
async renameConversation(
  conversationId: string,
  userId: string,
  title: string,
) {
  const conversation = await this.conversationModel.findOneAndUpdate(
    {
      _id: conversationId,
      userId,
    },
    {
      title,
    },
    {
      new: true,
    },
  );

  if (!conversation) {
    throw ErrorHandler.notFound('Conversation');
  }

  return SuccessResponseHandler.updated(
    'Conversation',
    conversation,
  );
}

//search conversation 
async searchConverations(
  userId: string,
  keyword: string
){
  const searchTerm = keyword?.trim();

  if (!searchTerm) {
    throw new BadRequestException('Search keyword is required');
  }

  const escapedKeyword = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keywordRegex = new RegExp(escapedKeyword, 'i');

  const userConversations = await this.conversationModel
    .find({
      userId: new mongoose.Types.ObjectId(userId),
      isArchived: { $ne: true },
    })
    .select('_id title');

  const userConversationIds = userConversations.map(
    (conversation) => conversation._id,
  );

  const matchingMessages = await this.messageModel
    .find({
      conversationId: { $in: userConversationIds },
      content: keywordRegex,
    })
    .select('conversationId');

  const conversationIds = matchingMessages.map((message) => message.conversationId);

  const conversations = await this.conversationModel
    .find({
      userId: new mongoose.Types.ObjectId(userId),
      isArchived: { $ne: true },
      $or: [
        { title: keywordRegex },
        { _id: { $in: conversationIds } },
      ],
    })
    .sort({ updatedAt: -1 });

  console.log('Search debug:', {
    userId,
    searchTerm,
    userConversationCount: userConversations.length,
    matchingMessageCount: matchingMessages.length,
    resultCount: conversations.length,
    userConversationTitles: userConversations.map(
      (conversation) => conversation.title,
    ),
  });

  return SuccessResponseHandler.retrived(
    'Conversations',
    conversations
  )
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

    if (chat.length === 0) {
      throw ErrorHandler.notFound('Chat Hisotry');
    }

    return SuccessResponseHandler.retrived('Chat History', chat);
  }

  //getall
async getUserConversations(
  userId: string,
  page = 1,
  limit = 10,
) {
  const skip = (page - 1) * limit;

  const [conversations, total] =
    await Promise.all([
      this.conversationModel
        .find({
          userId,
          isArchived: { $ne: true },
        })
        .sort({
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limit),

      this.conversationModel.countDocuments({
        userId,
        isArchived: { $ne: true },
      }),
    ]);

  return SuccessResponseHandler.retrived(
    "Conversations",
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      conversations,
    },
  );
}






  // Archive Conversation
async archiveConversation(
  conversationId: string,
  userId: string,
) {
  const conversation =
    await this.conversationModel.findOneAndUpdate(
      {
        _id: conversationId,
        userId,
      },
      {
        isArchived: true,
      },
      {
        new: true,
      },
    );

  if (!conversation) {
    throw ErrorHandler.notFound("Conversation");
  }

  return SuccessResponseHandler.updated(
    "Conversation archived",
    conversation,
  );
}

// Unarchive Conversation
async unarchiveConversation(
  conversationId: string,
  userId: string,
) {
  const conversation =
    await this.conversationModel.findOneAndUpdate(
      {
        _id: conversationId,
        userId,
      },
      {
        isArchived: false,
      },
      {
        new: true,
      },
    );

  if (!conversation) {
    throw ErrorHandler.notFound("Conversation");
  }

  return SuccessResponseHandler.updated(
    "Conversation restored",
    conversation,
  );
}

  // Delete Conversation
  async deleteConversation(conversationId: string) {
    await this.messageModel.deleteMany({
      conversationId,
    });

    await this.conversationModel.findByIdAndDelete(conversationId);

    return SuccessResponseHandler.deleted('Convesation');
  }

  //send message

  async sendMessage(conversationId: string, userId: string,  message: string) {
    return ErrorHandler.execute(async () => {
      const userMessage = message?.trim();

      if (!userMessage) {
        throw new BadRequestException('Message content is required');
      }

      const conversation = await this.conversationModel.findOne({
        _id: conversationId,
        userId,
      });
      console.log("convo", conversation);

      if (!conversation) {
        throw ErrorHandler.notFound('Conversation');
      }

      //save user message
      await this.messageModel.create({
        conversationId,
        role: 'user',
        content: userMessage,
      });
      console.log("convo2", conversationId)

      const history = await this.messageModel
        .find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(10);

        const recentHistory = history
  .slice(-4)
  .map((m) => `${m.role}: ${m.content}`)
  .join('\n');




  const rewrite = await this.llmService.rewriteQuery(
    history.map((m) => ({
      role: m.role,
      content: m.content
    })),
    message
  )
  console.log("Original:", message);
console.log("Rewritten:", rewrite);

const searchQuery = rewrite?.trim().length ? rewrite : message;

      //embedded query

      const vector = await this.embeddingService.generateEmbedding(searchQuery);

      //retrived chunks
      const chunks = await this.vectorStoreService.search(vector, searchQuery);

      const reranked = await this.rerankService.rerank(
        searchQuery,
        chunks
      )

      //build context
      const context = reranked.map((item: any) => item.content).join('\n\n');
      const messages = [
        {
          role: 'system',
          content: `
          
You are an intelligent AI assistant.

Your job is to answer questions using ONLY the retrieved context.

Rules:

1. Use the retrieved context as your primary source.
2. If the answer exists, explain it naturally.
3. Never copy entire paragraphs.
4. If the context is incomplete, answer only what is supported.
5. If the answer cannot be found, reply:
"I couldn't find that information in the uploaded documents."
6. When appropriate, use bullet points.
7. Keep answers concise unless the user requests detail.
8. Consider previous conversation messages when the user asks follow-up questions like:
   - "why?"
   - "explain more"
   - "what about the second one?"
9. Never invent facts.
10. Never mention internal implementation such as vectors, embeddings, or retrieval unless the user asks.


          `,
        },
        {
          role: 'system',
          content: `Context:\n${context}`,
        },
        ...history.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const answer = await this.llmService.chat(messages);

      const verification = await this.llmService.verify(
        searchQuery,
        context,
        answer
      )

      if(!verification.grounded){
        return{
               answer:
        "I couldn't confidently answer using the uploaded documents.",

        sources: [],
        verification,
        }
      }




   const titlePrompt = [
  {
    role: 'system',
    content: `
Generate a short title for this conversation.

Rules:
- Maximum 5 words.
- No quotation marks.
- No punctuation.
- Return ONLY the title.
`,
  },
  {
    role: 'user',
    content: userMessage,
  },
];

const title =
  await this.llmService.chat(titlePrompt);

await this.renameConversation(
  conversationId,
  userId,
  title.trim(),
);


    //save assistent message
      await this.messageModel.create({
        conversationId,
        role: 'assistant',
        content: answer,
      });

      return {
        answer,
        sources: await this.buildSources(reranked),
        verification,
      };
    }, 'Faild to send-message');
  }
}

  




