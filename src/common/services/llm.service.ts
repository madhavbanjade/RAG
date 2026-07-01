import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AnswerVerification = {
  grounded: boolean;
  confidence: number;
  reason: string;
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

  const content = response.choices[0]?.message?.content?.trim();
  return content || '';
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


  private parseVerificationJson(result: string): AnswerVerification {
    const cleaned = result
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!cleaned) {
      return {
        grounded: false,
        confidence: 0,
        reason: 'Verifier returned an empty response.',
      };
    }

    try {
      const parsed = JSON.parse(cleaned);

      return {
        grounded: parsed.grounded === true,
        confidence:
          typeof parsed.confidence === 'number'
            ? parsed.confidence
            : 0,
        reason:
          typeof parsed.reason === 'string'
            ? parsed.reason
            : '',
      };
    } catch (error) {
      return {
        grounded: false,
        confidence: 0,
        reason: `Verifier returned invalid JSON: ${cleaned}`,
      };
    }
  }

  // Hallucination  Detication  => verify the answer before return the response 
  async verify(
    question: string,
    context: string,

    answer: string,
  ): Promise<AnswerVerification>{
    const model =   this.configService.getOrThrow<string>("GROQ_MODEL");


  const prompt = `
You are an AI answer verifier.

You MUST determine whether the answer is completely supported by the provided context.

Question:
${question}

Retrieved Context:
${context}

Generated Answer:
${answer}

Rules:

- Only use the retrieved context.
- If any claim is unsupported, grounded must be false.
- If numbers, dates or names differ, grounded must be false.
- Return ONLY valid JSON.
{
  "grounded": true,
  "confidence": 0.98,
  "reason": ""
}
`;

  const response =
    await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

      const result =
    response.choices[0]?.message?.content ?? "{}";

  return this.parseVerificationJson(result);


  }


}
