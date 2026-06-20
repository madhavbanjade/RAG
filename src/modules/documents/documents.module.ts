import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { documentSchema } from './schema/documents.schema';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports:[
    MongooseModule.forFeature([
      {
        name: "Document",
        schema: documentSchema
      }
    ])
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, JwtService],
  exports:[DocumentsService]
})
export class DocumentsModule {}
