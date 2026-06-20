import { Test, TestingModule } from '@nestjs/testing';
import { ParsersController } from './parsers.controller';
import { ParsersService } from './parsers.service';

describe('ParsersController', () => {
  let controller: ParsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParsersController],
      providers: [ParsersService],
    }).compile();

    controller = module.get<ParsersController>(ParsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
