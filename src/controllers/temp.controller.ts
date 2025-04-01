import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { isUsername } from "../validators/validator.js";
import { User } from "../models/user.model.js";
import Errorhandler from "../utils/errorHandler.js";
import * as argon2 from "argon2";
import { mailTemplate, otpGen } from "../features.js";
import { transporter } from "../app.js";
import { Otp } from "../models/otp.model.js";
import { Notification } from "../models/notifications.model.js";
import { IDbNotification, INotification } from "../types.js";

export const sendOtp = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;

    isUsername(username, next);

    const user = await User.findOne({ username });
    if (user)
      return next(
        new Errorhandler(
          "Sorry, this email address is already registered with us.",
          401
        )
      );

    async function main() {
      const otp = otpGen();

      const hash = await argon2.hash(otp);
      if (hash) {
        const alredy = await Otp.findOne({ username });
        if (alredy) {
          await Otp.deleteMany({ username });
        }
        await Otp.create({
          username,
          otp: hash,
          createdAt: Date.now(),
          expiresAt: Date.now() + 600000,
        });

        await transporter.sendMail({
          from: process.env.SENDER_MAIL,
          to: username,
          subject: "Verification Code",
          html: mailTemplate(otp, username),
        });

        return res.status(200).json({
          success: true,
          message:
            "A verification email has been sent to your address. Please check your inbox.",
        });
      }
    }
    main().catch((e) => next(e));
  }
);

export const verifyOtp = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { otp, username } = req.body;
    if (!otp || otp.length > 6 || !username)
      return next(new Errorhandler("Invalid Data Recived", 401));
    const isValid = await Otp.findOne({ username });
    if (!isValid) {
      return next(
        new Errorhandler(
          "Unauthorized access detected. You do not have permission for this action.",
          401
        )
      );
    }
    if (isValid!.expiresAt < Date.now()) {
      await Otp.deleteMany({ username });
      return next(
        new Errorhandler(
          "Your OTP has expired. Please request a new one to continue.",
          410
        )
      );
    }

    const auth = await argon2.verify(isValid!.otp, otp);
    if (!auth) {
      return next(
        new Errorhandler(
          "That code isn't valid. You can request a new one.",
          400
        )
      );
    } else {
      await Otp.deleteMany({ username });
      return res.status(200).json({
        success: true,
        message: "Verified Successfully",
      });
    }
  }
);

export const getNotifications = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const notifications = await Notification.find({
      receiver: req.token,
    })
      .populate("sender", "name avatar")
      .populate("post", "resources");

    if (!notifications) {
      return next(new Errorhandler("No Notifications Found", 404));
    } else {
      const transformNotifications = notifications.map((el: IDbNotification) => {
        return {
          post: {
            _id: el.post._id,
            attachment: el.post.resources[0].url,
          },
          type: el.type,
          _id: el._id,
          sender: {
            _id: el.sender._id,
            name: el.sender.name,
            avatar: {
              url: el.sender.avatar.url,
              public_id: el.sender.avatar.public_id,
            },
          },
          receiver: el.receiver,
          createdAt: el.createdAt,
          content: el.content,
        };
      });
      res.status(200).json({
        success: true,
        notifications : transformNotifications,
      });
    }
  }
);
