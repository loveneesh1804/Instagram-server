import { NextFunction, Request, Response } from "express";
import { Controller, IError } from "../types.js";

export const errorMiddleware = (
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;

  if(err.code === 11000){
    const msg = Object.keys(err.keyPattern).join(',');
    err.message = `Duplicate ${msg}`;
    err.statusCode = 400;
  }
  if(err.name === "CastError"){
    err.message = `Invalid ${err.path}`
    err.statusCode = 400;
  }

  return res.status(err.statusCode).send({
    success: false,
    message: err.message,
  });
};

export const TryCatch =
  (func: Controller) => async(req: Request, res: Response, next: NextFunction) => {
    try{
      await func(req,res,next)
    }catch(err){
      next(err);
    }
    // return Promise.resolve(func(req, res, next)).catch(next);
  };
