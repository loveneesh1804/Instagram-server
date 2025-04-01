import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import Errorhandler from "../utils/errorHandler.js";
import { User } from "../models/user.model.js";
import { sendToken } from "../utils/token.js";
import * as argon2 from "argon2";
import { Chat } from "../models/chat.models.js";
import { FollowRequest } from "../models/follow.model.js";
import { emitEvent } from "../utils/socketEvents.js";
import {
  NEW_REQUEST,
  Null,
  REAL_TIME_REQUEST,
  REFETCH_CHATS,
} from "../constants/event.js";
import { isPassword, isUsername } from "../validators/validator.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../features.js";

export const registerUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, username, password } = req.body;

    isUsername(username, next);
    isPassword(password, next);

    const isNew = await User.findOne({ username });
    if (isNew) return next(new Errorhandler("User Alredy Exists!", 501));

    const user = await User.create({
      name,
      username,
      bio: Null,
      password,
      avatar: {
        url: Null,
        public_id: Null,
      },
      followers: [],
      following: [],
    });

    if (user) return sendToken(res, user, 201, "Account Created Successfully");
  }
);

export const loginUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;

    isUsername(username, next);
    isPassword(password, next);

    if (!username || !password) {
      return next(new Errorhandler("Incomplete Data", 500));
    }

    const isUser = await User.findOne({ username }).select("+password");
    if (!isUser)
      return next(
        new Errorhandler("Sorry, invalid username. No such user exists.", 401)
      );

    const validPass = await argon2.verify(isUser.password, password);

    if (validPass) {
      return sendToken(res, isUser, 200, `Welcome ${isUser.name}`);
    }
    return next(
      new Errorhandler(
        "Sorry, your password was incorrect. Please double-check your password.",
        401
      )
    );
  }
);

export const myProfile = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.token);
    if (!user) return next(new Errorhandler("Invalid Id", 401));

    return res.status(200).json({
      user,
      success: true,
    });
  }
);

export const othersProfile = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return next(new Errorhandler("Invalid Username", 401));

    return res.status(200).json({
      user,
      success: true,
    });
  }
);

export const logoutUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    return res
      .status(200)
      .cookie("token", "", {
        sameSite: "none",
        httpOnly: true,
        secure: true,
        maxAge: 0,
      })
      .json({
        message: "Logged Out Successfully",
        success: true,
      });
  }
);

export const searchMsgUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search } = req.query;

    const myChat = await Chat.find({
      groupChat: false,
      groupMembers: req.token,
    });
    const membersId = myChat.flatMap((el) => el.groupMembers);

    const users = await User.find({
      _id: { $nin: membersId },
      name: { $regex: search, $options: "i" },
    }).limit(7);

    return res.status(200).json({
      data: users,
      success: true,
    });
  }
);

export const searchUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search } = req.query;

    const users = await User.find({
      name: { $regex: search, $options: "i" },
    })
      .select(["name", "username", "avatar"])
      .limit(7);

    return res.status(200).json({
      data: users,
      success: true,
    });
  }
);

export const sendRequest = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.body;
    if(id === req.token) return;
    const request = await FollowRequest.findOne({
      sender: req.token,
      receiver: id,
    });
    if (request) return next(new Errorhandler("Already Sent.", 400));

    const response = await FollowRequest.create({
      sender: req.token,
      receiver: id,
    });

    if (!response) return next(new Errorhandler("Something went wrong.", 500));

    const realtimeReq = await response.populate("sender", "name avatar");
    emitEvent(req, NEW_REQUEST, [id]);
    emitEvent(req, REAL_TIME_REQUEST, [id], "", realtimeReq);
    return res.status(200).json({
      success: true,
      message: "Rquest sent successfully!",
    });
  }
);

export const alreadyRequested = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const request = await FollowRequest.findOne({
      sender: req.token,
      receiver: id,
    });
    if (!request) return next(new Errorhandler("No Request Found!", 400));

    return res.status(200).json({
      success: true,
      message: request.status === "PENDING" ? "Already Sent" : "Already Friend",
    });
  }
);

export const acceptRequest = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reqId, accept } = req.body;

    const request = await FollowRequest.findById(reqId)
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    if (!request) return next(new Errorhandler("No Request Found", 404));

    const [sender, receiver] = await Promise.all([
      User.findById(request.sender._id),
      User.findById(request.receiver._id),
    ]);

    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Request Rejected",
      });
    }
    if (
      sender.followings.includes(receiver._id) ||
      receiver.followers.includes(sender._id)
    ) {
      return next(new Errorhandler("Already a Friend", 400));
    }
    sender.followings.push(receiver._id);
    receiver.followers.push(sender._id);

    const members = [sender._id, receiver._id];

    await sender.save();
    await receiver.save();
    request.status = "ACCEPTED";
    await request.save();

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Rquest Accepted",
    });
  }
);

export const getReqNotifications = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const requests = await FollowRequest.find({ receiver: req.token }).populate(
      "sender",
      "name avatar"
    );

    return res.status(200).json({
      success: true,
      data: requests,
    });
  }
);

export const getFollowers = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;

    if (userId.length !== 24)
      return next(new Errorhandler("Invalid User Id", 400));

    const followers = await User.findById(!userId ? req.token : userId)
      .select("followers")
      .populate("followers", "name avatar");

    if (!followers) return next(new Errorhandler("No Followers Found", 400));

    return res.status(200).json({
      success: true,
      data: followers,
    });
  }
);

export const getFollowing = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;

    if (userId.length !== 24)
      return next(new Errorhandler("Invalid User Id", 400));
    
    const following = await User.findById(!userId ? req.token : userId)
      .select("followings")
      .populate("followings", "name avatar");

    if (!following) return next(new Errorhandler("No Followings Found", 400));

    return res.status(200).json({
      success: true,
      data: following,
    });
  }
);

export const editUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, bio } = req.body;
    const avatar = req.file;

    const user = await User.findById(req.token);
    if (!user) {
      return next(new Errorhandler("No Such User Found!", 404));
    }
    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (avatar) {
      const photo = await uploadToCloudinary([avatar]);
      if (photo.length) {
        user.avatar.url !== Null &&
          (await deleteFromCloudinary([user.avatar.public_id]));
        user.avatar.url = photo[0].url;
        user.public_id = photo[0].public_id;
      }
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: "Updated Successfully!",
      data: user,
    });
  }
);

export const getFriendsSuggestions = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.token).select("followings");
    
    if (!user) {
      return next(new Errorhandler("No Followings Found", 404));
    }

    const suggestions = await Promise.all(
      user.followings.map(async (followingId:string) => {
        const followingUser = await User.findById(followingId).select("followings");
        return followingUser.followings; 
      })
    );

    const flattenedSuggestions = suggestions.flat();

    const uniqueSuggestions = [...new Set(flattenedSuggestions.map(id => id.toString()))].filter(
      (suggestionId) => 
        suggestionId !== req.token && !user.followings.includes(suggestionId)
    );

    const suggestedUsers = await User.find({
      _id: { $in: uniqueSuggestions }
    }).select("name avatar username");

    res.status(200).json({
      success: true,
      suggestions: suggestedUsers
    });
  }
);
