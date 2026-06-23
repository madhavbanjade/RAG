import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Embedding } from './schema/embeddings.schema';
import { IChunk } from '../chunking/schema/chunk.schema';
import { Model } from 'mongoose';
import { ErrorHandler } from 'src/common/handlers/error-handlers';

@Injectable()
export class EmbeddingService {
  constructor(
    @InjectModel('Embedding')
    private readonly embeddingModel: Model<Embedding>,

    @InjectModel('Chunk')
    private readonly chunkModel: Model<IChunk>,
  ) {}

  //generateEmbeddings
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await axios.post('http://localhost:11434/api/embed', {
      model: 'bge-m3',
      input: text,
    });

    return response.data.embeddings[0];
  }

  //test
  async testEmbedding() {
    const vector = await this.generateEmbedding(
      'What is Retrieval Augmented Generation?',
    );

    console.log('Dimensions:', vector.length);

    return vector.length;
  }

  //proces the chunk to embedded
  async processDocument(documentId: string) {
    const chunks = await this.chunkModel.find({
      documentId,
      embeddingStatus: 'PENDING',
    });

    if (!chunks.length) {
      return ErrorHandler.notFound('Chunks');
    }

    let embeddedCount = 0;
    for (const chunk of chunks) {
      const vector = await this.generateEmbedding(chunk.content);

      await this.embeddingModel.create({
        documentId: chunk.documentId?.toString(),
        chunkId: chunk._id?.toString(),
        content: chunk.content,
        vector,
        model: 'bge-m3',
        dimensions: vector.length,
      });

      ((chunk.embeddingStatus = 'EMBEDDED'),
        (chunk.embeddingModel = 'bge-m3'),
        (chunk.vectorDemensions = vector.length));

      await chunk.save();

      embeddedCount++;
    }

    return {
      success: true,
      embeddedChunk: embeddedCount,
    };
  }
}
