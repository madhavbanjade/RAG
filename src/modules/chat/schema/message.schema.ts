import mongoose from "mongoose";



export const messageSchema = new mongoose.Schema({

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation", 
        required: true
    },
    role:{
        type: String,
        enum : ['user', 'assistant'],
        required: true
    },
    content:{
        type: String,
        required: true
    }
    
    
},
{
    timestamps: true
}



)



export interface Message extends mongoose.Document{
    _id: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    role: "user" | "assistant";
    content: string,
    createdAt: Date,
    updatedAt: Date
}