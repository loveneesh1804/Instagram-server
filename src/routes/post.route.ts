import { Router } from "express";
import { commentPost, deleteComment, explorePost, getComments, getFriendsPost, getLikes, getMyMorePost, getMyPost, getOthersPost, getPost, likePost, newPost, removePost, updatePost } from "../controllers/post.controller.js";
import { auth } from "../middlewares/auth.js";
import { multipleUpload } from "../middlewares/multer.js";

const postRoute = Router();

postRoute.use(auth);

//path - api/post/new
postRoute.post('/new',multipleUpload,newPost);

//path - api/post/my
postRoute.get('/my',getMyPost);

//path - api/post/more-post
postRoute.get('/more-post',getMyMorePost);

//path - api/post/explore
postRoute.get('/explore',explorePost);

//path - api/post/other/:id
postRoute.get('/other/:id',getOthersPost);

//path - api/post/friends/feed
postRoute.get('/friends/feed',getFriendsPost);

//path - api/post/like
postRoute.post('/like',likePost);

//path - api/post/like/:id
postRoute.get('/like/:id',getLikes);

//path - api/post/comment
postRoute.post('/comment',commentPost);

//path - api/post/comment/:id
postRoute.get('/comment/:id',getComments);

//path - api/post/comment/:id
postRoute.delete('/comment/:id',deleteComment);

//path - api/post/:id
postRoute.route('/:id').get(getPost).delete(removePost).put(updatePost);

export default postRoute;