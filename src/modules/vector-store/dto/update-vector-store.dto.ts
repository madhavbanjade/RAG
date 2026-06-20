import { PartialType } from '@nestjs/mapped-types';
import { CreateVectorStoreDto } from './create-vector-store.dto';

export class UpdateVectorStoreDto extends PartialType(CreateVectorStoreDto) {}
