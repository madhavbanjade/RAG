import { Injectable } from '@nestjs/common';
import { CreateVectorStoreDto } from './dto/create-vector-store.dto';
import { UpdateVectorStoreDto } from './dto/update-vector-store.dto';

@Injectable()
export class VectorStoreService {
  create(createVectorStoreDto: CreateVectorStoreDto) {
    return 'This action adds a new vectorStore';
  }

  findAll() {
    return `This action returns all vectorStore`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vectorStore`;
  }

  update(id: number, updateVectorStoreDto: UpdateVectorStoreDto) {
    return `This action updates a #${id} vectorStore`;
  }

  remove(id: number) {
    return `This action removes a #${id} vectorStore`;
  }
}
