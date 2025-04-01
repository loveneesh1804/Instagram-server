import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  leaveGroup,
  myChats,
  newChat,
  removeMember,
  renameGroup,
  sendAttachment,
  unsendMessage,
} from "../controllers/chat.controller.js";
import { multipleUpload } from "../middlewares/multer.js";

const chatRoute = express.Router();

chatRoute.use(auth);

//path - /api/chat/new
chatRoute.post("/new", newChat);

//path - /api/chat/my
chatRoute.get("/my", myChats);

//path - /api/chat/group/add
chatRoute.put("/group/add", addMembers);

//path - /api/chat/group/remove
chatRoute.put("/group/remove", removeMember);

//path - /api/chat/group/leave/:id
chatRoute.delete("/group/leave/:id", leaveGroup);

//path - /api/chat/files
chatRoute.post("/files", multipleUpload, sendAttachment);

//path - /api/chat/message/:id
chatRoute.route("/message/:id").get(getMessages).delete(unsendMessage);

//path - /api/chat/:id
chatRoute.route("/:id").get(getChatDetails).put(renameGroup).delete(deleteChat);

export default chatRoute;
