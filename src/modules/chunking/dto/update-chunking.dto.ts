import { PartialType } from '@nestjs/mapped-types';
import { CreateChunkingDto } from './create-chunking.dto';

export class UpdateChunkingDto extends PartialType(CreateChunkingDto) {}
