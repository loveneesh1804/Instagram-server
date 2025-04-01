import mongoose, { Types } from "mongoose";

const PostSchema = new mongoose.Schema({
    caption : {
        type : String,
        required : [true,'Please Add Caption']
    },
    userId : {
        type : Types.ObjectId,
        required : [true,'Please Add User Id'],
        ref : "User"
    },
    resources : [{
        public_id : {
            type : String,
            required : [true,"Please Add Public Id"]
        },
        url : {
            type : String,
            required : [true,"Please Add Url"]
        }
    }],
    likes : [{
        type : Types.ObjectId,
        ref : "User"
    }],
    comments : [{
        user : {
            type : Types.ObjectId,
            ref : "User"
        },
        comment : {
            type : String
        },
        createdAt : {
            type : Date,
            required : true,
            default : Date.now
        }
    }],
    view : {
        type : String,
        enum : ['cover','contain'],
        default : 'cover'
    }
},{
    timestamps : true
})

export const Post = mongoose.models.Post || mongoose.model("Post",PostSchema);