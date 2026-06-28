import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RerankService {
  constructor(private readonly configService: ConfigService) {}

  async rerank(query: string, chunks: any[]) {
    if (!chunks.length) return [];

    const apiKey = this.configService.getOrThrow('JINA_API_KEY');
    const model =
      this.configService.get<string>('JINA_RERANK_MODEL') ?? 'jina-reranker-v3';

    const response = await axios.post(
      'https://api.jina.ai/v1/rerank',
      {
        model,
        query,
        documents: chunks.map((c) => c.content),
        top_n: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const results = response.data.results;

    return results.map((item: any) => ({
      ...chunks[item.index],
      rerankScore: item.relevance_score,
    }));
  }
}
