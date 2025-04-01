import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import Errorhandler from "../utils/errorHandler.js";
import { Chat } from "../models/chat.models.js";
import { emitEvent } from "../utils/socketEvents.js";
import { v4 as uuid } from "uuid";
import {
  ALERT,
  DELETE_MSG,
  LAST_MSG,
  NEW_MESSAGE_NOTIFY,
  NEW_MSG,
  REFETCH_CHATS,
} from "../constants/event.js";
import {
  IChat,
  INewMember,
  IResourcesType,
  MemberTypes,
  TransformMemberType,
} from "../types.js";
import {
  deleteFromCloudinary,
  getLastMessage,
  getOtherMember,
  uploadToCloudinary,
} from "../features.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

export const newChat = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { members } = req.body;

    if (!members.length) {
      return next(new Errorhandler("No Member Found!", 404));
    }

    if (members.length === 1) {
      const member = [...members, req.token];

      const m1 = await User.findById(members[0]).select("name");
      const m2 = await User.findById(req.token).select("name");

      await Chat.create({
        name: `${m1.name}-${m2.name}`,
        groupMembers: member,
        groupAdmin: req.token,
      });

      emitEvent(req, ALERT, member);
    } else {
      const allMembers = [...members, req.token];

      await Chat.create({
        name: "null",
        groupChat: true,
        groupAdmin: req.token,
        groupMembers: allMembers,
      });

      emitEvent(req, ALERT, allMembers);
    }

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
      message: "Chat Created Successfully!",
      success: true,
    });
  }
);

export const myChats = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const chats = await Chat.find({ groupMembers: req.token }).populate(
      "groupMembers",
      "name avatar username"
    );

    const transformChats = await Promise.all(
      chats.map(async (el) => {
        const otherMember = getOtherMember(el.groupMembers, req.token);
        const lastMessage = await getLastMessage(el._id);
        return {
          _id: el._id,
          groupChats: el.groupChat,
          groupName: el.groupChat
            ? el.name
            : (otherMember as TransformMemberType).name,
          groupMembers: el.groupMembers.reduce(
            (acc: INewMember[], el: TransformMemberType) => {
              if (el._id.toString() !== req.token.toString()) {
                acc.push({
                  _id: el._id,
                  name: el.name,
                  avatar: el.avatar,
                  username: el.username,
                });
              }
              return acc;
            },
            []
          ),
          lastMessage: lastMessage.length ? lastMessage[0] : {},
          avatar: el.groupChat
            ? el.groupMembers
                .slice(0, 2)
                .map((i: TransformMemberType) => i.avatar.url)
            : [(otherMember as TransformMemberType).avatar.url],
        };
      })
    );

    return res.status(200).json({
      success: true,
      chats: transformChats,
    });
  }
);

export const addMembers = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { chatId, newMembers } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new Errorhandler("No Chat Found", 404));

    if (!chat.groupChat) return next(new Errorhandler("Not a groupChat", 400));

    if (chat.groupAdmin.toString() !== req.token.toString()) {
      return next(new Errorhandler("Not Allowed", 403));
    }

    const allNewMembersPromise = newMembers.map((el: mongoose.Types.ObjectId) =>
      User.findById(el, "name")
    );
    const allNewMembers = await Promise.all(allNewMembersPromise);

    const finalMembers = allNewMembers
      .filter((i) => !chat.groupMembers.includes(i._id.toString()))
      .map((i) => i._id);

    chat.groupMembers.push(...finalMembers);

    if (chat.groupMembers.length > 100) {
      return next(new Errorhandler("Group Limit Reached!", 400));
    }

    await chat.save();

    const allNewMembersName = newMembers
      .map((el: INewMember) => el._id)
      .join(",");

    emitEvent(
      req,
      ALERT,
      chat.groupMembers,
      `${allNewMembersName} has been added to Group`
    );
    emitEvent(req, REFETCH_CHATS, chat.groupMembers);

    return res.status(200).json({
      success: true,
      message: "Members Added Successfully",
    });
  }
);

export const removeMember = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { chatId, userId } = req.body;

    const [chat, removedUser] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);
    if (!chat) return next(new Errorhandler("No Chat Found", 404));

    if (!chat.groupChat) return next(new Errorhandler("Not a groupChat", 400));

    if (chat.groupAdmin.toString() !== req.token.toString()) {
      return next(new Errorhandler("Not Allowed", 403));
    }

    if (chat.groupMembers.length <= 3) {
      return next(new Errorhandler("Group must have atleast 3 members!", 400));
    }

    chat.groupMembers = chat.groupMembers.filter(
      (el: MemberTypes) => el.toString() !== userId.toString()
    );
    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.groupMembers,
      `${removedUser} has been removed from Group`
    );
    emitEvent(req, REFETCH_CHATS, chat.groupMembers);

    return res.status(200).json({
      success: true,
      message: "Member Removed Successfully",
    });
  }
);

export const leaveGroup = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new Errorhandler("No Chat Found", 404));

    if (!chat.groupChat) return next(new Errorhandler("Not a groupChat", 400));

    if (chat.groupAdmin.toString() === req.token.toString()) {
      return next(new Errorhandler("Admin Cannot Leave Group", 403));
    }

    if (chat.groupMembers.length <= 3) {
      return next(new Errorhandler("Group must have atleast 3 members!", 400));
    }

    chat.groupMembers = chat.groupMembers.filter(
      (el: MemberTypes) => el.toString() !== req.token.toString()
    );

    const leaveUser = await User.findById(req.token, "name");
    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.groupMembers,
      `${leaveUser.name} has leaved the Group`
    );

    return res.status(200).json({
      success: true,
      message: "Member Leaved Successfully",
    });
  }
);

export const sendAttachment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { chatId, _id } = req.body;

    if (!_id) {
      return next(new Errorhandler("Please Add Id", 404));
    }
    const files = req.files as Express.Multer.File[];
    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.token, "name avatar"),
    ]);

    if (!chat) return next(new Errorhandler("No Chat Found", 404));
    if (!files.length)
      return next(new Errorhandler("No Attachment Found", 404));

    const attachments = await uploadToCloudinary(files);

    const backendData = {
      content: "",
      attachments,
      sender: user._id,
      chatId,
      _id: _id,
    };

    const message = await Message.create(backendData);

    const payload = await message.populate("sender", "name avatar");

    emitEvent(req, NEW_MSG, chat.groupMembers, "", {
      chatId,
      message: payload,
    });

    emitEvent(req, NEW_MESSAGE_NOTIFY, chat.groupMembers, "", {
      chatId,
      message: payload,
    });

    emitEvent(req, LAST_MSG, chat.groupMembers, "", {
      chatId,
      message: payload,
    });

    return res.status(200).json({
      success: true,
      message: "Attachment Sent Successfully",
      data: message,
    });
  }
);

export const getChatDetails = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.query.populate === "true") {
      const chat = (await Chat.findById(req.params.id)
        .populate("groupMembers", "name avatar")
        .lean()) as any;

      if (!chat) return next(new Errorhandler("No Chat Found!", 404));

      chat.groupMembers = chat.groupMembers.map((el: TransformMemberType) => ({
        _id: el._id,
        name: el.name,
        avatar: el.avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);

      if (!chat) return next(new Errorhandler("No Chat Found!", 404));

      return res.status(200).json({
        success: true,
        chat,
      });
    }
  }
);

export const renameGroup = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new Errorhandler("No Chat Found", 404));

    if (!chat.groupChat) return next(new Errorhandler("Not a Group Chat", 400));

    if (chat.groupAdmin.toString() !== req.token.toString()) {
      return next(new Errorhandler("Not Allowed", 403));
    }

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.groupMembers);

    return res.status(200).json({
      success: true,
      message: "Group Name Changed Successfully!",
    });
  }
);

export const deleteChat = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new Errorhandler("No Chat Found", 404));

    if (chat.groupChat && chat.groupAdmin.toString() !== req.token.toString()) {
      return next(new Errorhandler("Not Allowed", 403));
    }
    if (!chat.groupChat && !chat.groupMembers.includes(req.token.toString())) {
      return next(new Errorhandler("Not Allowed", 403));
    }

    const resouceMsg = await Message.find({
      chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids: string[] = [];

    resouceMsg.forEach((el) => {
      el.attachments.forEach((id: string) => public_ids.push(id));
    });

    await Promise.all([
      deleteFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, chat.groupMembers);

    return res.status(200).json({
      success: true,
      message: "Chat Deleted Successfully!",
    });
  }
);

export const getMessages = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.params.id;

    const { page = 1 } = req.query;
    const limit = 20;
    const skip = ((page as number) - 1) * limit;

    const [messages, count] = await Promise.all([
      Message.find({ chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name avatar")
        .lean(),
      Message.countDocuments({ chatId }),
    ]);

    const pages = Math.ceil(count / limit) || 0;

    return res.status(200).json({
      success: true,
      data: messages.reverse(),
      pages,
    });
  }
);

export const unsendMessage = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const msgId = req.params.id;

    if (!msgId.length) {
      return next(new Errorhandler("Missing Id.", 400));
    }
    const response = await Message.findById(msgId).populate(
      "chatId",
      "groupMembers"
    );

    if (!response) {
      return next(new Errorhandler("Message not found.", 404));
    }

    if (response.attachments.length) {
      const urls: string[] = [];
      response.attachments.forEach((el: IResourcesType) => {
        urls.push(el.url);
      });
      await deleteFromCloudinary(urls);
    }

    emitEvent(req, DELETE_MSG, response.chatId.groupMembers, "", {
      id: msgId,
    });

    await response.deleteOne();

    const newLastMsg = await getLastMessage(response.chatId._id);
    emitEvent(req, LAST_MSG, response.chatId.groupMembers, "", {
      message: newLastMsg.length ? newLastMsg[0] : [],
    });

    return res.status(200).json({
      success: true,
      message: "Message Deleted Successfully.",
    });
  }
);
