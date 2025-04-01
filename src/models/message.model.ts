import mongoose, { Types } from "mongoose";

export const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required : [true,"Please Add Sender"]
    },
    chatId: {
      type: Types.ObjectId,
      ref: "Chat",
      required : [true,"Please Add Chat"]
    },
    content : String,
    attachments : [{
        public_id : {
            type : String,
            required : [true,"Please Add Public Id"]
        },
        url : {
            type : String,
            required : [true,"Please Add Url"]
        }
    }],
    _id : {
      type: String,
      required : [true,"Please Add ID"]
    },
  },
  {
    timestamps: true,
  }
);

export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
