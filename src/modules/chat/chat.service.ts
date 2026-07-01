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
import { RedisService } from 'src/common/services/redis.service';

const TTL = {
  conversations: 30,  // user conversation list — short so new chats appear fast
  history: 30,        // chat history — invalidated on every new message
};

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
    private readonly rerankService: RerankService,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey = {
    conversations: (userId: string) => `chat:conversations:${userId}`,
    history: (conversationId: string) => `chat:history:${conversationId}`,
  };

  private async invalidateUserCache(userId: string, conversationId?: string) {
    await this.redisService.del(this.cacheKey.conversations(userId));
    if (conversationId) {
      await this.redisService.del(this.cacheKey.history(conversationId));
    }
  }

  private async buildSources(chunks: any[]) {
    // Only show sources that genuinely contributed to the answer
    const relevant = chunks
      .filter((item) => (item.rerankScore ?? 0) >= 0.1)
      .sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0))
      .slice(0, 3);

    if (!relevant.length) return [];

    const chunkIds = relevant.map((item) => item.chunkId).filter(Boolean);

    const dbChunks = await this.chunkModel
      .find({ _id: { $in: chunkIds } })
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

    const seen = new Set<string>();
    const sources: { documentName: string; page: number; score: number; rerankScore: number }[] = [];

    for (const item of relevant) {
      const dbChunk = item.chunkId ? chunkById.get(String(item.chunkId)) : null;
      const document = dbChunk?.documentId
        ? documentById.get((dbChunk as any).documentId.toString())
        : null;

      // Prefer MongoDB (authoritative), fall back to Qdrant payload
      const documentName =
        (document as any)?.files?.[0]?.originalName ||
        (document as any)?.title ||
        item.documentName ||
        null;

      if (!documentName) continue;

      const page: number = (dbChunk as any)?.metadata?.pageNumber ?? item.page ?? 1;
      const key = `${documentName}::${page}`;
      if (seen.has(key)) continue;
      seen.add(key);

      sources.push({ documentName, page, score: item.score, rerankScore: item.rerankScore });
    }

    return sources;
  }

  //create conversation
  async createConversation(
    userId: string, title = 'New Chat'
  ) {
    const conversation = await this.conversationModel.create({
      userId,
      title,
    });

    if (!conversation) {
      throw ErrorHandler.notFound(conversation);
    }

    await this.messageModel.create({
      conversationId: conversation._id,
      role: 'assistant',
      content: "Hi! I'm your Raag AI assistant. Ask me anything about your uploaded documents and I'll do my best to help.",
    });

    await this.redisService.del(this.cacheKey.conversations(userId));

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

  await this.invalidateUserCache(userId, conversationId);

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
    const cacheKey = this.cacheKey.history(conversationId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const chat = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit);

    if (chat.length === 0) {
      throw ErrorHandler.notFound('Chat Hisotry');
    }

    const result = SuccessResponseHandler.retrived('Chat History', chat);
    await this.redisService.set(cacheKey, JSON.stringify(result), TTL.history);
    return result;
  }

  //getall
async getUserConversations(
  userId: string,
  page = 1,
  limit = 10,
) {
  const cacheKey = this.cacheKey.conversations(userId);
  const cached = await this.redisService.get(cacheKey);
  if (cached) return JSON.parse(cached);

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

  const result = SuccessResponseHandler.retrived(
    "Conversations",
    { page, limit, total, totalPages: Math.ceil(total / limit), conversations },
  );

  await this.redisService.set(cacheKey, JSON.stringify(result), TTL.conversations);

  return result;
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

  await this.invalidateUserCache(userId, conversationId);

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

  await this.invalidateUserCache(userId, conversationId);

  return SuccessResponseHandler.updated(
    "Conversation restored",
    conversation,
  );
}

  // Delete Conversation
  async deleteConversation(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId).select('userId').lean();

    await this.messageModel.deleteMany({ conversationId });
    await this.conversationModel.findByIdAndDelete(conversationId);

    if (conversation?.userId) {
      await this.invalidateUserCache(String(conversation.userId), conversationId);
    }

    return SuccessResponseHandler.deleted('Convesation');
  }

  private isGreeting(text: string): boolean {
    const greetings = /^\s*(hi+|hey+|hello+|howdy|sup|what'?s up|good\s*(morning|afternoon|evening|day)|greetings|hiya|yo)\b[!?.]*\s*$/i;
    return greetings.test(text.trim());
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

      if (this.isGreeting(userMessage)) {
        const reply = await this.llmService.chat([
          {
            role: 'system',
            content: `You are Raag, a friendly AI assistant that helps users explore their uploaded documents.
When greeted, if user include hi, hy, hello, what's up respond warmly and briefly — one or two sentences max.
Let the user know you are ready to answer questions about their documents.
Do not mention technical details like embeddings or retrieval.`,
          },
          { role: 'user', content: userMessage },
        ]);
        await this.messageModel.create({ conversationId, role: 'assistant', content: reply });
        return { answer: reply, sources: [], verification: { grounded: true } };
      }

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

      let answer: string;
      try {
        answer = await this.llmService.chat(messages);
      } catch {
        answer = '';
      }

      if (!answer) {
        const fallback = "I'm having trouble generating a response right now. Please try again.";
        await this.messageModel.create({ conversationId, role: 'assistant', content: fallback });
        await this.invalidateUserCache(userId, conversationId);
        return { answer: fallback, sources: [], verification: { grounded: false } };
      }

      const verification = await this.llmService.verify(
        searchQuery,
        context,
        answer
      )

      if(!verification.grounded){
        const fallback = "I couldn't confidently answer using the uploaded documents.";
        await this.messageModel.create({
          conversationId,
          role: 'assistant',
          content: fallback,
        });
        return{ answer: fallback, sources: [], verification };
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

try {
  const title = await this.llmService.chat(titlePrompt);
  if (title?.trim()) {
    await this.renameConversation(conversationId, userId, title.trim());
  }
} catch { /* title generation is best-effort */ }


    //save assistent message
      await this.messageModel.create({
        conversationId,
        role: 'assistant',
        content: answer,
      });

      await this.invalidateUserCache(userId, conversationId);

      return {
        answer,
        sources: await this.buildSources(reranked),
        verification,
      };
    }, 'Faild to send-message');
  }
}

  




