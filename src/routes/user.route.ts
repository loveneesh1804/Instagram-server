import express from "express";
import {
  acceptRequest,
  alreadyRequested,
  editUser,
  getFollowers,
  getFollowing,
  getFriendsSuggestions,
  getReqNotifications,
  loginUser,
  logoutUser,
  myProfile,
  othersProfile,
  registerUser,
  searchMsgUser,
  searchUser,
  sendRequest,
} from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.js";
import { singleUpload } from "../middlewares/multer.js";

const userRoute = express.Router();

//path - /api/user/register
userRoute.post("/register", registerUser);

//path - /api/user/login
userRoute.post("/login", loginUser);

userRoute.use(auth);

//path - /api/user/my-profile
userRoute.get("/my-profile", myProfile);

//path - /api/user/edit
userRoute.put("/edit",singleUpload, editUser);

//path - /api/user/logout
userRoute.get("/logout", logoutUser);

//path - /api/user/message/search
userRoute.get("/message/search", searchMsgUser);

//path - /api/user/friends/suggestion
userRoute.get("/friends/suggestion", getFriendsSuggestions);

//path - /api/user/search
userRoute.get("/search", searchUser);

//path - /api/user/send-request
userRoute.put("/send-request", sendRequest);

//path - /api/user/send-request/:id
userRoute.get("/send-request/:id", alreadyRequested);

//path - /api/user/accept-request
userRoute.put("/accept-request", acceptRequest);

//path - /api/user/notifications
userRoute.get("/notifications", getReqNotifications);

//path - /api/user/followers/:id
userRoute.get("/followers/:id", getFollowers);

//path - /api/user/followings/:id
userRoute.get("/followings/:id", getFollowing);

//path - /api/user/:id
userRoute.get("/:id", othersProfile);

export default userRoute;
