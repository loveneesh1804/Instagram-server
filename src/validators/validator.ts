import { NextFunction } from "express";
import Errorhandler from "../utils/errorHandler.js";

export const isUsername = (value: string,next:NextFunction) => {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!value) {
    return next(new Errorhandler('Username is mandatory',400));
  }
  if (!regex.exec(value)) {
    return next(new Errorhandler('Username is Invalid',400));
  }
  return ;
};

export const isPassword = (value: string,next:NextFunction) => {
  const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
  if (!value) {
    return next(new Errorhandler('Password is mandatory.',400));
  }
  if (value.length < 8) {
    return next(new Errorhandler('Password must have least 8 characters.',400));
  }
  if (value.search(/[0-9]/) < 0) {
    return next(new Errorhandler('Password must contain at least one digit.',400));
  }
  if (value.search(/[A-Z]/) < 0) {
    return next(new Errorhandler('Password must have one Uppercase letter.',400));
  }
  if (!regex.exec(value)) {
    return next(new Errorhandler('Password must have one special character.',400));
  }
  return ;
};
