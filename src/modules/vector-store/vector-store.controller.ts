import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from '../embeddings/embeddings.service';
import { ProtectLoginGuard } from 'src/common/guards/auth.guards';
import { RoleProtectGuard } from 'src/common/guards/role-gaurds';

@Controller('vector-store')
@UseGuards(ProtectLoginGuard, RoleProtectGuard)
export class VectorStoreController {
  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Post('test-search')
  async testSearch(@Body() body: { query: string }) {
    const vector = await this.embeddingService.generateEmbedding(body.query);
    return this.vectorStoreService.search(vector);
  }

  @Get('points')
  async getPoints() {
    return this.vectorStoreService.getPoints();
  }

  @Delete('collection')
  async deleteCollection() {
    return this.vectorStoreService.deleteCollection();
  }
}
