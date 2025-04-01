import mongoose, { Types } from "mongoose";

const FollowSchema = new mongoose.Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required : [true,"Please Add Sender"]
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required : [true,"Please Add Receiver"]
    },
    status: {
      type : String,
      default : "PENDING",
      enum : ["PENDING","ACCEPTED","REJECTED"]
    },
  },
  {
    timestamps: true
  }
);

export const FollowRequest =
  mongoose.models.FollowRequest || mongoose.model("FollowRequest", FollowSchema);
