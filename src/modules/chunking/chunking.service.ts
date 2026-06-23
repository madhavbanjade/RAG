import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IChunk } from './schema/chunk.schema';
import { Model } from 'mongoose';

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  constructor(
    @InjectModel('Chunk')
    private readonly chunkModel: Model<IChunk>,
  ) {}

  //splits text into chunks with overlap
  splitText(text: string, chunkSize = 500, overlap = 50): string[] {
    if (!text?.trim()) {
      return [];
    }

    const words = text.replace(/\s+/g, ' ').trim().split(' ');

    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words
        .slice(i, i + chunkSize)
        .join(' ')
        .trim();
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  //save chunks in database
  async saveChunks(documentId: string, chunks: string[]): Promise<IChunk[]> {
    if (!chunks.length) {
      return [];
    }
    const chunkDocuments = chunks.map((current, index) => ({
      documentId,
      chunkIndex: index,
      content: current,
      tokenCount: current.split(/\s+/).length,
      embeddingStatus: 'PENDING' as const,
    }));

    return await this.chunkModel.insertMany(chunkDocuments);
  }

  //chauk and save documnets
  async processDocument(
    documentId: string,
    extactedText: string,


  ): Promise<IChunk[]>{
 this.logger.log(`Processing document ${documentId}`);

 const chunks = this.splitText(extactedText);

 this.logger.log(`Generated ${chunks.length} chunks`);

 const savedChunks = await this.saveChunks(
  documentId,
  chunks
 );
   this.logger.log(`${savedChunks.length} chunks saved`)

   return savedChunks;

  }


  //get chunks by document 
  async findChunkdByDocument(
    documentId: string

  ): Promise<IChunk[]>{
    return await this.chunkModel.find({documentId}).sort({chunkIndex: 1});
  }

//delete chunks by documents
async deleteChunksByDocument(documentId: string): Promise<void>{
  await this.chunkModel.deleteMany({
    documentId,
  })



}





}
