import mongoose from "mongoose";
export const conversationSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true
    }
},
{
    timestamps: true
}

)


export interface Conversation extends mongoose.Document{
    _id: mongoose.Types.ObjectId;
    title: string;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;

}