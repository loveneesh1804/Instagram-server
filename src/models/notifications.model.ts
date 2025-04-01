import mongoose, { Types } from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Please Add Sender"],
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Please Add Receiver"],
    },
    type: {
      type: String,
      required: [true, "Please Add Type"],
      enum: ["LIKE", "COMMENT", "POST"],
    },
    post : {
      type: Types.ObjectId,
      ref: "Post",
      required: [true, "Please Add Type"]
    },
    content  : {
      type: String,
      default : ''
    }
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 864000 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
