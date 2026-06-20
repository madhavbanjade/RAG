import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParsersService } from './parsers.service';
import { CreateParserDto } from './dto/create-parser.dto';
import { UpdateParserDto } from './dto/update-parser.dto';

@Controller('parsers')
export class ParsersController {
  constructor(private readonly parsersService: ParsersService) {}

  @Post()
  create(@Body() createParserDto: CreateParserDto) {
    return this.parsersService.create(createParserDto);
  }

  @Get()
  findAll() {
    return this.parsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parsersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParserDto: UpdateParserDto) {
    return this.parsersService.update(+id, updateParserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parsersService.remove(+id);
  }
}
