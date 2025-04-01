import { Request } from "express";
import { MemberTypes, SocketData } from "../types.js";
import { socketIDs } from "../app.js";
import mongoose from "mongoose";
import { DefaultEventsMap, Server } from "socket.io";

export const emitEvent = (
  req: Request,
  event: string,
  users: string[],
  msg = "",
  data: any = {}
) => {
  const io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> = req.app.get('io');
  const userSockets = getSocket(users);
  io.to(userSockets).emit(event,data);
};

export const getSocket = (users: string[] = []) =>
  users.map((user) => socketIDs.get(user.toString()));
