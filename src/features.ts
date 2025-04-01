import mongoose from "mongoose";
import { MemberTypes } from "./types.js";
import { Message } from "./models/message.model.js";
import cloudinary from "cloudinary";

export const getOtherMember = (members: MemberTypes[], user: string) =>
  members.find((el) => el._id.toString() !== user.toString());

export const getLastMessage = async (chatId: mongoose.Types.ObjectId) => {
  const lastMessage = await Message.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(1).populate('sender','name');
  return lastMessage;
};

export const deleteFromCloudinary = async (id: string[]) => {
  const promise = id.map(el=>{
    return new Promise<cloudinary.DeleteApiResponse>((resolve,reject)=>{
      cloudinary.v2.uploader.destroy(el,(err,result)=>{
        if (err) return reject(err);
        resolve(result as cloudinary.DeleteApiResponse);
      })
    })
  })
  try{
    const result = await Promise.all(promise);
    return result;
  }catch{
    throw new Error("Error Deleting Files from cloudinary");
  }
};

const base64 = (file: Express.Multer.File) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const uploadToCloudinary = async (files: Express.Multer.File[] = []) => {
  const promises = files.map((el: Express.Multer.File) => {
    return new Promise<cloudinary.UploadApiResponse>((resolve, rejects) => {
      cloudinary.v2.uploader.upload(
        base64(el),
        {
          resource_type: "auto",
        },
        (err, result) => {
          if (err) return rejects(err);
          resolve(result as cloudinary.UploadApiResponse);
        }
      );
    });
  });
  try {
    const result = await Promise.all(promises);
    const formatResult = result.map((el) => ({
      public_id: el.public_id,
      url: el.secure_url,
    }));
    return formatResult;
  } catch {
    throw new Error("Error Uploading files to cloudinary.");
  }
};

export const otpGen = (): string => {
  const data = "1234567890";
  let otp = "";
  for (var i = 0; i < 6; i++) {
    otp += data[Math.floor(Math.random() * data.length)];
  }
  return otp;
};

export const mailTemplate = (otp: string, mail: string): string => `
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
      rel="stylesheet"
    />
    <style>
      * {
        box-sizing: border-box;
        font-family: "Roboto", sans-serif;
      }
      .box{
        padding: 20px 40px;
      }
      .header{
        display: flex;
        align-items: stretch;
        padding: 10px 0px;
        border-bottom: 1px solid rgb(189, 189, 189);
      }
      img{
        margin: 0px 20px 0px 0px;
      }
      .header > img:first-child{
        width: 50px;
        height: 50px;
      }
      .header > img:last-child{
        width: 170px;
        height: 60px;
      }
      .line{
        border: 0.7px solid rgb(189, 189, 189);
      }
      .msg{
        padding: 20px 0px;
      }
      .msg > p{
        font-size: 16px;
      }
      .msg > p:last-child{
        border-top: 1px solid rgb(189, 189, 189);
        padding: 20px 0px;
      }
      .msg > h1{
        color: #737373;
        font-weight: 500;
        font-size: 40px;
      }
      p > span{
        color: #8e8e8e;
        font-size: 13px;
      }
      @media screen and (max-width: 600px) {
        .box{
          padding: 20px ;
        }
      }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="header">
        <img width="50" height="50" src="https://freepngimg.com/thumb/logo/69812-instagram-business-icons-color-computer-organization-logo.png" alt="ico">
        <div class="line"></div>
        <img style="margin-left: 20px;" width="170" height="60" src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Instagram_logo.svg/2560px-Instagram_logo.svg.png" alt="ico">
      </div>
      <div class="msg">
        <p>Hi</p>
        <p>Someone tired to register with your email account.</p>
        <p>If this was you, please use the following code to verify yourself :</p>
        <h1>${otp}</h1>
        <p>
          If you did not request this code, it is possible that someone else is
          trying to access your Account ${mail}.
          <b> Do not forward or give this code to anyone.</b> <br /><br>
          <span>© Instagram, CA 94022, 2024</span>
          <br>
          <span>
            You received this message because this email address is listed as the
            registered email Account ${mail}.
          </span>
        </p>
      </div>
    </div>
  </body>
</html>
`;
