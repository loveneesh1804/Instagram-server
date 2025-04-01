import mongoose, { Types } from "mongoose";

const ChatSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,'Please Add Name']
    },
    groupChat : {
        type : Boolean,
        default : false
    },
    groupMembers : [{
        type : Types.ObjectId,
        ref : "User"
    }],
    groupAdmin : {
        type : Types.ObjectId,
        ref : "User"
    }
},{
    timestamps : true
})

export const Chat = mongoose.models.Chat || mongoose.model("Chat",ChatSchema);