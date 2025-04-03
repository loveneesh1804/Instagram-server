import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import Errorhandler from "../utils/errorHandler.js";
import { Post } from "../models/post.model.js";
import { CloudFileType, CommentType } from "../types.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../features.js";
import { emitEvent } from "../utils/socketEvents.js";
import { NEW_REQUEST } from "../constants/event.js";
import { Notification } from "../models/notifications.model.js";
import { User } from "../models/user.model.js";

export const newPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { caption, view } = req.body;
    const files = req.files || [];

    if (!files.length) return next(new Errorhandler("No Post Data Found", 404));

    if (!caption) return next(new Errorhandler("Caption can't be empty", 400));

    const resources = await uploadToCloudinary(files as Express.Multer.File[]);

    await Post.create({
      userId: req.token,
      caption,
      resources,
      likes: [],
      comments: [],
      view,
    });

    return res.status(201).json({
      message: "Post Created Successfully!",
      success: true,
    });
  }
);

export const getMyPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1 } = req.query;
    const limit = 12;
    const skip = ((page as number) - 1) * limit;

    const [myPost, count] = await Promise.all([
      Post.find({ userId: req.token })
        .populate("likes", "name avatar")
        .sort({ createdAt: -1 })
        .populate("comments.user", "name avatar")
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ userId: req.token }),
    ]);

    if (!myPost) return next(new Errorhandler("Post Not Found", 404));
    const pages = Math.ceil(count / limit) || 0;

    return res.status(200).json({
      data: myPost,
      success: true,
      pages,
    });
  }
);

export const getMyMorePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id,user } = req.query;
    if (!id) return next(new Errorhandler("Invalid Id", 500));

    const myPosts = await Post.find({ userId: user, _id: { $ne: id } })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(6);

    if (!myPosts) return next(new Errorhandler("Post Not Found", 404));

    return res.status(200).json({
      data: myPosts,
      success: true,
      username: myPosts[0].userId.name,
    });
  }
);

export const explorePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1 } = req.query;
    const limit = 10;
    const skip = ((page as number) - 1) * limit;
    const posts = await Post.aggregate([
      {
        $match: { userId: { $ne: req.token } },
      },
      {
        $group: {
          _id: "$userId",
          posts: { $push: "$$ROOT" },
        },
      },
      {
        $match: { posts: { $ne: [] } },
      },
      {
        $addFields: {
          randomPost: {
            $arrayElemAt: [
              "$posts",
              {
                $floor: {
                  $multiply: [
                    { $rand: {} },
                    { $size: { $ifNull: ["$posts", []] } },
                  ],
                },
              },
            ],
          },
        },
      },
      {
        $match: { randomPost: { $ne: null } },
      },
      {
        $replaceRoot: { newRoot: "$randomPost" },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    if (!posts) return next(new Errorhandler("No post Found", 404));

    const totalUsers = await Post.distinct("userId", {
      userId: { $ne: req.token },
    }).countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      success: true,
      data: posts.map((p) => ({
        resources: p.resources[0].url,
        view: p.view,
        _id: p._id,
        likes: p.likes.length,
        comments: p.comments.length,
      })),
      totalPages,
    });
  }
);

export const getOthersPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1 } = req.query;
    const { id } = req.params;
    const limit = 12;
    const skip = ((page as number) - 1) * limit;

    if (id.length !== 24 || !id)
      return next(new Errorhandler("Invalid ID", 401));

    const [myPost, count] = await Promise.all([
      Post.find({ userId: id })
        .populate("likes", "name avatar")
        .sort({ createdAt: -1 })
        .populate("comments.user", "name avatar")
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ userId: id }),
    ]);

    if (!myPost) return next(new Errorhandler("Post Not Found", 404));
    const pages = Math.ceil(count / limit) || 0;

    return res.status(200).json({
      data: myPost,
      success: true,
      pages,
    });
  }
);

export const likePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId, like } = req.body;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const post = await Post.findById(postId);
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    if (like) {
      if (post.likes.includes(req.token)) {
        return next(new Errorhandler("Already Liked", 400));
      }
      post.likes.push(req.token);

      if (req.token !== post.userId.toString())
        emitEvent(req, NEW_REQUEST, [post.userId]);

      await post.save();
      return res.status(200).json({
        message: "Post Liked",
        success: true,
      });
    }

    await Notification.deleteOne({
      sender: req.token,
      receiver: post.userId,
      type: "LIKE",
      post: post._id,
    });

    post.likes = post.likes.filter((el: string) => el.toString() !== req.token);
    await post.save();
    return res.status(200).json({
      message: "Post Unliked",
      success: true,
    });
  }
);

export const getLikes = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.id;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const likes = await Post.findById(postId)
      .select("likes")
      .populate("likes", "name avatar");

    if (!likes) return next(new Errorhandler("Post Not Found", 404));

    return res.status(200).json({
      data: likes,
      success: true,
    });
  }
);

export const commentPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId, comment } = req.body;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    if (!comment) {
      return next(new Errorhandler("Comment can't be empty!", 400));
    }

    const post = await Post.findById(postId);
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    let exist = false;
    post.comments.forEach((el: CommentType) => {
      if (el.user.toString() === req.token) exist = true;
    });

    if (exist) {
      return next(new Errorhandler("Already Commented", 400));
    }
    post.comments.push({ user: req.token, comment });
    if (req.token !== post.userId.toString())
      emitEvent(req, NEW_REQUEST, [post.userId]);

    await post.save();
    return res.status(200).json({
      message: "Comment Added!",
      success: true,
    });
  }
);

export const deleteComment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || id.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const post = await Post.findById(id);
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    let exist = false;
    post.comments.forEach((el: CommentType) => {
      if (el.user.toString() === req.token) exist = true;
    });

    if (!exist) {
      return next(new Errorhandler("No Comment Found", 400));
    }
    post.comments = post.comments.filter(
      (el: CommentType) => el.user.toString() !== req.token
    );

    await Notification.deleteOne({
      sender: req.token,
      receiver: post.userId,
      type: "COMMENT",
      post: post._id,
    });

    await post.save();
    return res.status(200).json({
      message: "Comment Deleted!",
      success: true,
    });
  }
);

export const getPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.id;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const post = await Post.findById(postId)
      .populate("likes", "name avatar")
      .populate("comments.user", "name avatar")
      .populate("userId", "name avatar");
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    return res.status(200).json({
      data: post,
      success: true,
    });
  }
);

export const getComments = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.id;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const comments = await Post.findById(postId)
      .select("comments")
      .populate("comments.user", "name avatar");

    if (!comments) return next(new Errorhandler("Post Not Found", 404));

    return res.status(200).json({
      data: comments,
      success: true,
    });
  }
);

export const removePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.id;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const post = await Post.findById(postId);
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    //// Delete resources from cloudinary

    await post.deleteOne();

    return res.status(200).json({
      message: "Post Deleted Successfully!",
      success: true,
    });
  }
);

export const updatePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.id;
    const { caption, public_id } = req.body;

    if (!postId || postId.length !== 24)
      return next(new Errorhandler("Invalid Post Id", 400));

    const post = await Post.findById(postId);
    if (!post) return next(new Errorhandler("Post Not Found", 404));

    if (caption) post.caption = caption;
    if (public_id) {
      const [fileToRemove] = post.resources.filter(
        (el: CloudFileType) => el.public_id === public_id
      );

      await deleteFromCloudinary([fileToRemove.public_id]);

      post.resources = post.resources.filter(
        (el: CloudFileType) => el.public_id !== public_id
      );
    }
    await post.save();
    return res.status(200).json({
      message: "Post Updated Successfully!",
      success: true,
    });
  }
);

export const getFriendsPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.token).select("followings");

    if (!user) {
      return next(new Errorhandler("No Following Found.", 404));
    }

    const posts = await Promise.all(
      user.followings.map(async (followingId: string) => {
        return await Post.findOne({
          userId: followingId,
          likes: { $ne: req.token },
        })
          .sort({ createdAt: -1 })
          .populate("userId", "name avatar");
      })
    );

    const filteredPosts = posts.filter((post) => post !== null);

    res.status(200).json({
      success: true,
      posts: filteredPosts,
    });
  }
);
