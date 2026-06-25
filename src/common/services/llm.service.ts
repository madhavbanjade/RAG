import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class LlmService {
     constructor(private readonly configService: ConfigService) {}
  private readonly groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  async generate(prompt: string){
       const model =
      this.configService.getOrThrow<string>('GROQ_MODEL');

    const response = await this.groq.chat.completions.create({
        //
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content ?? 'No response generated';
  }
}
