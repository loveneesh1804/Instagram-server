import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Errorhandler from "./utils/errorHandler.js";

export type Controller = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  password: string;
  bio: string;
  avatar: {
    public_id: string;
    url: string;
  };
  followers: string[];
  followings: string[];
}

export type TokenType = {
  _id: string;
};

export type MemberTypes = {
  _id: mongoose.Types.ObjectId;
};

export interface INewMember {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar: {
    public_id : string;
    url : string;
  }
  username: string;
}

export type IResourcesType = {
  public_id: string;
  url: string;
}

export type TransformMemberType = {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar: {
    public_id: string;
    url: string;
  };
  username: string;
};

export type CloudFileType = {
  public_id: string;
  url: string;
};

export type SocketData = {
  chatId: string;
  message: object;
};

export interface IChat {
  name: string;
  _id: string
  groupChat: boolean;
  groupMembers: [
    {
      _id: mongoose.Types.ObjectId;
      name: string;
      avatar: string;
    }
  ];
  groupAdmin: mongoose.Types.ObjectId;
}

export interface TransformChats{
  name: string;
  _id: string
  groupChat: boolean;
  groupMembers: [
    {
      _id: mongoose.Types.ObjectId;
      name: string;
      avatar: {
        public_id: string;
        url: string;
      };
      username: string;
    }
  ];
  groupAdmin: mongoose.Types.ObjectId;
}

export interface IError extends Errorhandler {
  keyPattern: object;
  code: number;
  path: string;
}

export type SocketNewMsg = {
  chatId: mongoose.Types.ObjectId;
  groupMembers: string[];
  message: string;
};

export type CommentType = {
  user: mongoose.Types.ObjectId;
  comment: string;
};

export interface INotification {
  receiver: string;
  type: "LIKE" | "COMMENT" | "POST";
  attachment: string;
  content: string;
  post: string;
}

export type IDbNotification = {
  post : {
    _id: string;
    resources: {
      public_id: string;
      url: string;
    }[]
  };
  type : "LIKE" | "COMMENT" | "POST";
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar: {
      url : string;
      public_id: string;
    }
  };
  receiver : string;
  createdAt: string;
  content: string;
};
