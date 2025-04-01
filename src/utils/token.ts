import { Response } from "express";
import { IUser } from "../types.js";
import jwt from "jsonwebtoken";

export const sendToken = (
  res: Response,
  user: IUser,
  code: number,
  message: string
) => {
  const token = jwt.sign({ _id: user._id }, process.env.TOKEN_KEY as string);

  return res
    .status(code)
    .cookie("token", token, {
      maxAge: 15 * 24 * 24 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      message,
      success: true,
    });
};
