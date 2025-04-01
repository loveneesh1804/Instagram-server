import mongoose from "mongoose";

const AuthSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true
    },
    otp : {
        type : String,
        required : true
    },
    createdAt : {
        type : Number,
        required : true
    },
    expiresAt : {
        type : Number,
        required : true
    }
})

export const Otp = mongoose.models.Otp || mongoose.model("Otp",AuthSchema);