import { Injectable } from '@nestjs/common';
import { CreateChunkingDto } from './dto/create-chunking.dto';
import { UpdateChunkingDto } from './dto/update-chunking.dto';

@Injectable()
export class ChunkingService {
  create(createChunkingDto: CreateChunkingDto) {
    return 'This action adds a new chunking';
  }

  findAll() {
    return `This action returns all chunking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chunking`;
  }

  update(id: number, updateChunkingDto: UpdateChunkingDto) {
    return `This action updates a #${id} chunking`;
  }

  remove(id: number) {
    return `This action removes a #${id} chunking`;
  }
}
