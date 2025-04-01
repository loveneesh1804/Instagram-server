import cloudinary from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import nodemailer from "nodemailer";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import {
  DELETE_NOTIFICATION,
  LAST_MSG,
  NEW_MESSAGE_NOTIFY,
  NEW_MSG,
  NEW_NOTIFICATION,
  START_TYPING,
  STOP_TYPING,
} from "./constants/event.js";
import { socketAuth } from "./middlewares/auth.js";
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from "./models/message.model.js";
import chatRoute from "./routes/chat.route.js";
import tempRoute from "./routes/temp.route.js";
import postRoute from "./routes/post.route.js";
import userRoute from "./routes/user.route.js";
import { IUser, SocketNewMsg, INotification } from "./types.js";
import { connectDB } from "./utils/connectDb.js";
import { getSocket } from "./utils/socketEvents.js";
import { Notification } from "./models/notifications.model.js";

declare global {
  namespace Express {
    export interface Request {
      token: string;
    }
  }
}

declare module "socket.io" {
  interface Socket {
    user: IUser;
  }
}

dotenv.config();
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL as string],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  },
});

const port = process.env.PORT_NO;
connectDB(process.env.SERVER_URI as string);
export const socketIDs = new Map();
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  name: "Keyators",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SENDER_MAIL,
    pass: process.env.APP_PASSWORD,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: [process.env.CLIENT_URL as string],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(cookieParser(process.env.SESSION_KEY as string));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Welcome to API",
  });
});

app.use("/api/user", userRoute);
app.use("/api/chat", chatRoute);
app.use("/api/post", postRoute);
app.use("/api/temp", tempRoute);

io.use((socket, next) => {
  const req = socket.request as express.Request;

  cookieParser(process.env.SESSION_KEY as string)(
    req,
    {} as express.Response,
    async (err) => await socketAuth(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  socketIDs.set(user._id.toString(), socket.id);

  socket.on(
    NEW_MSG,
    async ({ message, chatId, groupMembers }: SocketNewMsg) => {
      const id = uuid();
      const realTimeMsg = {
        content: message,
        chatId,
        _id: id,
        sender: {
          _id: user._id,
          name: user.name,
        },
        createdAt: new Date().toISOString(),
      };
      const dbMsg = {
        content: message,
        sender: user._id,
        chatId,
        _id: id
      };

      const userSockets = getSocket(groupMembers);
      io.to(userSockets).emit(NEW_MSG, {
        chatId,
        message: realTimeMsg,
      });
      io.to(userSockets).emit(NEW_MESSAGE_NOTIFY, { chatId,message: realTimeMsg });

      const res = await Message.create(dbMsg);
      const payload = await res.populate('sender','name');
      io.to(userSockets).emit(LAST_MSG,{
        chatId,
        message: payload,
      })
    }
  );

  socket.on(
    NEW_NOTIFICATION,
    async ({ attachment, type, receiver,content='',post }: INotification) => {
      if(user._id.toString() === receiver) return;
      const dbNotification = {
        post,
        sender: user._id,
        receiver,
        type,
        content
      };
      const res = await Notification.create(dbNotification);

      const realTimeNotify = {
        post : {
          _id : post,
          attachment 
        },
        type,
        _id: res._id,
        sender: {
          _id: user._id,
          name: user.name,
          avatar: {
            url: user.avatar.url,
            public_id: "",
          },
        },
        receiver,
        content,
        createdAt: res.createdAt,
      };
      if (res) {
        const userSockets = getSocket([receiver]);
        io.to(userSockets).emit(NEW_NOTIFICATION, {
          message: realTimeNotify,
        });
      }
    }
  );

  socket.on(
    DELETE_NOTIFICATION,
    ({ post, type, receiver }: INotification) => {
      if(user._id.toString() === receiver) return;
      const userSockets = getSocket([receiver]);
      io.to(userSockets).emit(DELETE_NOTIFICATION, {
        post,type,receiver
      });
    }
  );

  socket.on(START_TYPING, ({ chatId, members }) => {
    const membersSocket = getSocket(members);

    socket.to(membersSocket).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ chatId, members }) => {
    const membersSocket = getSocket(members);

    socket.to(membersSocket).emit(STOP_TYPING, { chatId });
  });

  socket.on("disconnect", () => {
    socketIDs.delete(user._id.toString());
  });
});

app.use(errorMiddleware);

server.listen(port, () => {
  console.log("Server Working Successfully!");
});
