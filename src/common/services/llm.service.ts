import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class LlmService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  private readonly groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  async generate(prompt: string): Promise<string> {
    const model =
      this.configService.getOrThrow<string>('GROQ_MODEL');

    const response =
      await this.groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
        top_p: 1
      });

    const content = response.choices[0]?.message?.content?.trim();

    return content || 'No response generated';
  }

  async chat(messages: any[]): Promise<string> {
    const model =
      this.configService.getOrThrow<string>('GROQ_MODEL');

    const response =
      await this.groq.chat.completions.create({
        model,
        messages,
      });

  const content = response.choices[0]?.message?.content;

if (!content) {
    throw new Error("Groq returned empty response");
}

return content;
  }


  //query rewriting
  async rewriteQuery(
    history: ChatMessage[],
    question: string
  ): Promise<string>{
    const response = await this.groq.chat.completions.create({
      model: this.configService.getOrThrow<string>('GROQ_MODEL'),
      messages:[

        {
          role: 'system',
          content: 
          `
          You rewrite search queries for a Retrieval-Augmented Generation (RAG) system.

Rules:
- Rewrite the user's latest question into a complete standalone search query.
- Use the previous conversation only to resolve references like:
  - it
  - they
  - that
  - this
  - he
  - she
  - why
- Do NOT answer the question.
- Return ONLY the rewritten query.
- Keep it short and searchable.
        
          `,
        },
        ...history,
        {
          role: 'user',
          content: question
        }
      ]
    });
      return response.choices[0]?.message?.content?.trim() ?? question;

  }
}
