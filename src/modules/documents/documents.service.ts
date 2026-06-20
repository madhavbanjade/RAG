import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { InjectModel } from '@nestjs/mongoose';
import { IDocument } from './schema/documents.schema';
import { Model } from 'mongoose';
import { ErrorHandler } from 'src/common/handlers/error-handlers';
import { SuccessResponseHandler } from 'src/common/handlers/success-handlers';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()


export class DocumentsService {

  constructor(
    @InjectModel("Document")
    private readonly documentModel: Model<IDocument>
  ){}


  //the documents service is created to get metasdata from the pdf. the only purpose of the modules.
 async create(documentData: CreateDocumentDto, userId: string) {
    return ErrorHandler.execute(async () => {
      const document = await this.documentModel.create({
        ...documentData,
        files: [],
        uploadedBy: userId,

      })
      return SuccessResponseHandler.created('Documents', document)

    }, 'Failed to Create Document') 
  }



  async findAll() {
    return ErrorHandler.execute(async () => {
      const documents = await this.documentModel.find().populate(
        "uploadedBy",
        "name email role"
      )

      if(documents.length === 0) {
        throw ErrorHandler.notFound("Documents")
      }

      return SuccessResponseHandler.retrived("Documents", documents)


    },'Failed to getall documents')
  }


  async findOne(id: string) {
    return ErrorHandler. execute(async () => {
 const document = await this.documentModel.findById(id);
      console.log(await this.documentModel.findById(id));

 if(!document) {
  throw ErrorHandler.notFound("Document")
 }
 return SuccessResponseHandler.retrived("Document", document)

    }, 'Failed to get one document')
  }


  async findMyDocuments(userId: string){
    return ErrorHandler.execute(async () => {
      const myDocument = await this.documentModel.find({
        uploadedBy: userId
      })

      if(myDocument.length === 0){
        throw ErrorHandler.notFound("My Documents")
      }

      return SuccessResponseHandler.retrived("myDocs", myDocument)
    }, 'Failed to get my Document')
  }


  async update(id: string, documentData: UpdateDocumentDto) {
    return ErrorHandler.execute(async () => {
      const document = await this.documentModel.findByIdAndUpdate(
        id, 
        documentData,
        {
          new: true
        }
      )
      return SuccessResponseHandler.updated("Documents", document)

    }, "Failed to update documents")
  }




async remove(id: string) {
  return ErrorHandler.execute(async () => {
    const document = await this.documentModel.findById(id);

    if (!document) {
      throw ErrorHandler.notFound('Document');
    }

    // 1. Delete files from disk
    if (document.files && document.files.length > 0) {
      for (const file of document.files) {
        if (file.filePath) {
          const fullPath = join(process.cwd(), file.filePath);

          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath); // delete file
            }
          } catch (err) {
            console.error(`Failed to delete file: ${fullPath}`, err);
          }
        }
      }
    }

    // 2. Delete document from DB
    const deleted = await this.documentModel.findByIdAndDelete(id);

    return SuccessResponseHandler.deleted("Document", deleted);
  }, 'Failed to delete document');
}



  //upload-single docs
  async uploadFile(id: string, file: Express.Multer.File){
    return ErrorHandler.execute(async () => {
          const document = await this.documentModel.findById(id);
    if(!document) {
      throw ErrorHandler.notFound("Document");
    }

     if(!file){
      throw ErrorHandler.operationFailed("File is Required !")
     }

     document.files.push({
  originalName : file.originalname,
    filePath : file.path.replace(process.cwd(), ''),
    mimeType : file.mimetype,
    fileSize : file.size,

     })

     if (!file || !file.originalname || !file.path) {
  throw new BadRequestException("Invalid file upload");
}

    document.status = "UPLOADED";

  
    await document.save();


    return SuccessResponseHandler.uploaded("Document")

    }, 'Failed to upload single file') 

  }

  //upload multiple files
 async uploadMultipleFile(id: string, files: Express.Multer.File[]) {
  return ErrorHandler.execute(async () => {
    const document = await this.documentModel.findById(id);

    if (!document) {
      throw ErrorHandler.notFound("Document");
    }

    // ✅ IMPORTANT: validate files properly
    if (!files || files.length === 0) {
      throw ErrorHandler.operationFailed("Files are required!");
    }

    // ✅ safety: remove invalid files if any
    const validFiles = files.filter(
      (file) => file?.originalname && file?.path
    );

    if (validFiles.length === 0) {
      throw ErrorHandler.operationFailed("No valid files found!");
    }

    const mapped = validFiles.map((file) => ({
      originalName: file.originalname,
      filePath: file.path.replace(process.cwd(), ''),
      mimeType: file.mimetype,
      fileSize: file.size,
    }));

    // ❌ REMOVE THIS (it was wrong variable + unnecessary)
    // document.files = document.files.filter(...)

    // ✅ push correctly
    document.files.push(...mapped);

    document.status = "UPLOADED";

    await document.save();

    return SuccessResponseHandler.uploaded("Multiple Files");
  }, "Failed to upload multiple files");
}


}
