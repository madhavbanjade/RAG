  import { Module } from '@nestjs/common';
  import { AppController } from './app.controller';
  import { AppService } from './app.service';
  import { ConfigModule } from '@nestjs/config';
  import { DatabaseModule } from './modules/database/database.module';
  import { UsersModule } from './modules/users/users.module';
import { MailService } from './common/services/mail/mail.service';
import { DocumentsModule } from './modules/documents/documents.module';
import { StorageModule } from './modules/storage/storage.module';

import { ChunkingModule } from './modules/chunking/chunking.module';
import { EmbeddingModule } from './modules/embeddings/embeddings.module';
import { VectorStoreModule } from './modules/vector-store/vector-store.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { DocumentParserService } from './common/services/document-parser.service';


// hello world
  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      DatabaseModule,
      UsersModule,
      DocumentsModule,
      StorageModule,
      ChunkingModule,
      EmbeddingModule,
      VectorStoreModule,
      RagModule,
      ChatModule,
      AdminModule,
    ],
    controllers: [AppController],
    providers: [AppService, MailService, DocumentParserService],
  })
  export class AppModule {}
