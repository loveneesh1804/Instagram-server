import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ExtendedError, Socket } from "socket.io";
import { User } from "../models/user.model.js";
import { TokenType } from "../types.js";
import Errorhandler from "../utils/errorHandler.js";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies["token"];

  if (!token) return next(new Errorhandler("Login to acess content", 401));

  const decoded = jwt.verify(
    token,
    process.env.TOKEN_KEY as string
  ) as TokenType;
  req.token = decoded._id;

  return next();
};

export const socketAuth = async (
  err: Error,
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    if (err) {
      return next(err);
    }
    const req = socket.request as Request;
    const token = req.cookies.token;
    if (!token) return next(new Errorhandler("Login to acess content", 401));

    const decoded = jwt.verify(
      token,
      process.env.TOKEN_KEY as string
    ) as TokenType;
    const user = await User.findById(decoded._id);

    if (!user) return next(new Errorhandler("Invalid User", 404));
    socket.user = user;

    return next();
  } catch (e) {
    return next(
      new Errorhandler("Unauthorised User. Please Login to Access.", 401)
    );
  }
};
