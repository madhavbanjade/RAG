import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { documentSchema } from './schema/documents.schema';
import { JwtService } from '@nestjs/jwt';
import { DocumentParserService } from 'src/common/services/document-parser.service';
import { ChunkingModule } from '../chunking/chunking.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Document',
        schema: documentSchema,
      },
    ]),
    ChunkingModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, JwtService, DocumentParserService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
