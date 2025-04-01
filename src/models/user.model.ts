import mongoose, { Types } from "mongoose";
import * as argon2 from "argon2";

const UserSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,'Please Add Full Name']
    },
    username : {
        type : String,
        required : [true,'Please Add Username'],
        unique : true
    },
    password : {
        type : String,
        select : false,
        required : [true,"Please Add Password"]
    },
    bio : {
        type : String,
        required : [true,'Please Add Bio']
    },
    avatar : {
        public_id : {
            type : String,
            required : [true,"Please Add Public Id"]
        },
        url : {
            type : String,
            required : [true,"Please Add Url"]
        }
    },
    followers : [{
        type : Types.ObjectId,
        ref : "User"
    }],
    followings : [{
        type : Types.ObjectId,
        ref : "User"
    }]
},{
    timestamps : true
});

UserSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password = await argon2.hash(this.password as string);
});

export const User = mongoose.models.User || mongoose.model("User",UserSchema);