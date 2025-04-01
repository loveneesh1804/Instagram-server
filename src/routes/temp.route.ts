import express from "express";
import { getNotifications, sendOtp, verifyOtp } from "../controllers/temp.controller.js";
import { auth } from "../middlewares/auth.js";

const tempRoute = express.Router();

//path- api/temp/otp/send
tempRoute.post('/otp/send',sendOtp);

//path- api/temp/otp/verify
tempRoute.post('/otp/verify',verifyOtp);

tempRoute.use(auth);

//path- api/temp/notify
tempRoute.get('/notify',getNotifications);

export default tempRoute;