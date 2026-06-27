import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

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
}
