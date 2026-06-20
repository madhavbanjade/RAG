import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { CreateVectorStoreDto } from './dto/create-vector-store.dto';
import { UpdateVectorStoreDto } from './dto/update-vector-store.dto';

@Controller('vector-store')
export class VectorStoreController {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  @Post()
  create(@Body() createVectorStoreDto: CreateVectorStoreDto) {
    return this.vectorStoreService.create(createVectorStoreDto);
  }

  @Get()
  findAll() {
    return this.vectorStoreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vectorStoreService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVectorStoreDto: UpdateVectorStoreDto) {
    return this.vectorStoreService.update(+id, updateVectorStoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vectorStoreService.remove(+id);
  }
}
