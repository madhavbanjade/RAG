import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingController } from './chunking.controller';
import { ChunkingService } from './chunking.service';

describe('ChunkingController', () => {
  let controller: ChunkingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChunkingController],
      providers: [ChunkingService],
    }).compile();

    controller = module.get<ChunkingController>(ChunkingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
