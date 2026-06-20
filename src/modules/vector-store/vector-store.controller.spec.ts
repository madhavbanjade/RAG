import { Test, TestingModule } from '@nestjs/testing';
import { VectorStoreController } from './vector-store.controller';
import { VectorStoreService } from './vector-store.service';

describe('VectorStoreController', () => {
  let controller: VectorStoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VectorStoreController],
      providers: [VectorStoreService],
    }).compile();

    controller = module.get<VectorStoreController>(VectorStoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
