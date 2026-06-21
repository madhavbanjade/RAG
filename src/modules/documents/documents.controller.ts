import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Req, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ProtectLoginGuard } from 'src/common/guards/auth.guards';
import { RoleProtectGuard } from 'src/common/guards/role-gaurds';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadMultiple, UploadSingle } from 'src/common/config/multer.config';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(ProtectLoginGuard)
  create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
  const userId = req['user'].id; 

    return this.documentsService.create(createDocumentDto, userId);
  }

//upload single
  @Post(':id/upload')
  @UploadSingle('file')
  uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ){
     console.log("FILE RECEIVED:", file);
    return this.documentsService.uploadFile(id, file)
  }

//upload multiple
  @Post(':id/upload-multiple')
  @UploadMultiple('files', 5)
  uploadMultiple(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ){
    return this.documentsService.uploadMultipleFile(id, files)
  }



  @Get()
  @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  findAll() {
    return this.documentsService.findAll();
  }
   

   @Get('/my')
   @UseGuards(ProtectLoginGuard)
   findMyDocuments(@Req() req: any){
    return this.documentsService.findMyDocuments(req.user.id);
   }


  @Get(':id')
  @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  // check

  @Patch(':id')
  @UseGuards(ProtectLoginGuard)
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @UseGuards(ProtectLoginGuard)
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
