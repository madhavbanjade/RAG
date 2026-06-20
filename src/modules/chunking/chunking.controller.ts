import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { CreateChunkingDto } from './dto/create-chunking.dto';
import { UpdateChunkingDto } from './dto/update-chunking.dto';

@Controller('chunking')
export class ChunkingController {
  constructor(private readonly chunkingService: ChunkingService) {}

  @Post()
  create(@Body() createChunkingDto: CreateChunkingDto) {
    return this.chunkingService.create(createChunkingDto);
  }

  @Get()
  findAll() {
    return this.chunkingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chunkingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChunkingDto: UpdateChunkingDto) {
    return this.chunkingService.update(+id, updateChunkingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chunkingService.remove(+id);
  }
}
