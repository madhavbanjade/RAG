import mongoose from "mongoose";


const fileSchema = new mongoose.Schema({
       originalName:{
            type: String,
            required: false
        },
        filePath:{
            type: String,
            required: false
        },
        mimeType: {
            type: String,
            required: false
        },
        fileSize:{
            type: Number,
            required: false
        },
},
{_id: false}
)

export interface IFile {
  originalName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
}



export const documentSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true
        },
    files: [fileSchema],
     
        uploadedBy:{
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: false
            
        },
        status:{
            type: String,
            enum:[
                "CREATED",
                "UPLOADED",
                "PARSED",
                "CHUNKED",
                "EMBEDDED"

            ],
    default: "CREATED",
        }
    },
    {
        timestamps: true,
    }
)


export interface IDocument extends mongoose.Document{
    title: string;
  files: IFile[];
 
    uploadedBy: string;
    status: "UPLOADED" | "PARSED" | "CHUNKED" | "EMBEDDED";
}