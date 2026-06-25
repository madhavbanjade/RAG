import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmbeddingService } from './embeddings.service';
import { ProtectLoginGuard } from 'src/common/guards/auth.guards';
import { RoleProtectGuard } from 'src/common/guards/role-gaurds';

@Controller('embeddings')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Get('test')
  @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  async test() {
    return this.embeddingService.testEmbedding();
  }
}
