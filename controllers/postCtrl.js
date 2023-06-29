const multer = require("multer");
const User = require("../models/User");
const Post = require("../models/Post");
const uploadContents = require("../utils/uploadContents");
const asyncHandler = require("express-async-handler");
const fs = require("fs");

// @desc    upload post
// @route   POST /post
// @access  PRIVATE
const uploadPost = asyncHandler(async (req, res, next) => {
  uploadContents(req, res, async function (err) {
    if (err instanceof multer.MulterError || err) {
      res.status(400);
      return next(err);
    }

    if (req.files.length < 1) {
      res.status(400);
      return next(new Error("Error no file selected"));
      // An unknown error occurred when uploading.
    }

    try {
      const user = await User.findById(req.user._id);
      const newPost = await Post.create({
        contentType: req.body.contentType,
        postedBy: user._id,
        caption: req.body.caption,
        content: req.files.map((file) => file.filename),
      });
      await user.updateOne({ $push: { posts: newPost._id } });

      res.status(201).json(newPost);
    } catch (error) {
      req.files?.map(
        (file) => fs.existsSync(file.path) && fs.unlinkSync(file.path)
      );
      res.status(500);
      return next(error);
    }
  });
});

// @desc    get all posts
// @route   GET /post
// @access  PUBLIC
const getPosts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 9;

  const currentPage = Number(req.query.page) || 1;

  const skipPost = limit * (currentPage - 1);

  const totalPosts = await Post.find().countDocuments();

  const maxPages = Math.ceil(totalPosts / limit);

  let filter = {};

  if (req.query.type) {
    filter = { contentType: req.query.type };
  }

  const posts = await Post.find(filter)
    .populate("postedBy likes", "_id username profilePicture slug")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "_id username profilePicture slug",
      },
    })
    .limit(limit)
    .skip(skipPost)
    .sort({ createdAt: -1 });

  res.status(200).json({ posts, maxPages });
});

// @desc    get post Detail
// @route   GET /post/:postId
// @access  PUBLIC
const getPostDetail = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId)
    .populate("postedBy likes", "_id username profilePicture slug")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "_id username profilePicture slug",
      },
    });

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  res.status(200).json(post);
});

// @desc    delete post
// @route   DELETE /post/:postId
// @access  PRIVATE
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (req.user._id.toString() !== post.postedBy.toString()) {
    res.status(403);
    throw new Error("Action Forbidden");
  }

  await post.deleteOne();

  post.content?.map((c) => {
    fs.existsSync("./public/" + c) && fs.unlinkSync("./public/" + c);
  });
  fs.existsSync("./public/thumbnail/" + post.thumbnail) &&
    fs.unlinkSync("./public/thumbnail/" + post.thumbnail);

  const user = await User.findById(req.user._id);

  const index = user.posts.indexOf(req.params.postId);
  user.posts.splice(index, 1);

  await user.save();

  res.status(200).json(post._id);
});

// @desc    update post
// @route   PUT /post/:postId
// @access  PRIVATE
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (req.user._id.toString() !== post.postedBy.toString()) {
    res.status(403);
    throw new Error("Action Forbidden");
  }

  if (req.body.caption) {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        caption: req.body.caption,
      },
      { new: true }
    );
  }

  res.status(200).json(post._id);
});

// @desc    get post of following
// @route   GET /post/postfollowing
// @access  PRIVATE
const getPostFollowing = asyncHandler(async (req, res) => {
  const user = req.user;

  const limit = Number(req.query.limit) || 4;

  const currentPage = Number(req.query.page) || 1;

  const skipPost = limit * (currentPage - 1);

  const totalPosts = await Post.find({
    postedBy: { $in: user.followings },
  }).countDocuments();

  const maxPages = Math.ceil(totalPosts / limit);

  const postFollowing = await Post.find({
    postedBy: { $in: user.followings },
  })
    .populate("postedBy likes", "_id username profilePicture slug")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "_id username profilePicture slug",
      },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skipPost);

  res.status(200).json({ posts: postFollowing, totalPosts, maxPages });
});

// @desc    get saved post detail
// @route   GET /post/saved
// @access  PRIVATE
const getSavedPost = asyncHandler(async (req, res) => {
  const user = req.user;

  const limit = Number(req.query.limit) || 18;

  const currentPage = Number(req.query.page) || 1;

  const skipPost = limit * (currentPage - 1);

  const totalPosts = await Post.find({
    _id: { $in: user.saved },
  }).countDocuments();

  const maxPages = Math.ceil(totalPosts / limit);

  const saved = await Post.find({
    _id: { $in: user.saved },
  })
    .populate("postedBy likes", "_id username profilePicture slug")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "_id username profilePicture slug",
      },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skipPost);

  res.status(200).json({ posts: saved, totalPosts, maxPages });
});

// @desc    like and unlike post
// @route   PATCH /post/:postId/likeAndUnlike
// @access  PRIVATE
const likeAndUnlike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (!post.likes.includes(req.user._id)) {
    await post.updateOne({ $push: { likes: req.user._id } });

    res.status(200).json({
      _id: req.params.postId,
      user: {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      },
      message: "The post has been liked",
    });
  } else {
    await post.updateOne({ $pull: { likes: req.user._id } });

    res.status(200).json({
      _id: req.params.postId,
      user: {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      },
      message: "The post has been unliked",
    });
  }
});

// @desc    save and unsave post
// @route   PUT /post/:postId/saveandunsave
// @access  PRIVATE
const saveAndUnsave = asyncHandler(async (req, res) => {
  const user = req.user;
  const post = await Post.findById(req.params.postId);

  if (!post.savedBy.includes(req.user._id)) {
    await post.updateOne({ $push: { savedBy: req.user._id } });

    await user.updateOne({ $push: { saved: post._id } });

    res.status(200).json({
      id: req.params.postId,
      user: {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      },
      message: "The post has been saved",
    });
  } else {
    await post.updateOne({ $pull: { savedBy: req.user._id } });

    await user.updateOne({ $pull: { saved: post._id } });

    res.status(200).json({
      id: req.params.postId,
      user: {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      },
      message: "The post has been Unsaved",
    });
  }
});

// @desc    add comment post
// @route   UPDATE /post/:postId/addcomment
// @access  PRIVATE
const addComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (!req.body.comment) {
    res.status(400);
    throw new Error("Comment cant be empty");
  }

  try {
    const result = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $push: { comments: { user: req.user._id, comment: req.body.comment } },
      },
      { new: true }
    );

    const data = {
      _id: result.comments[result.comments.length - 1]._id,
      postId: req.params.postId,
      user: {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      },
      comment: req.body.comment,
    };

    res.status(200).json({ data, message: "Comment added" });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

module.exports = {
  uploadPost,
  getPosts,
  getPostDetail,
  updatePost,
  deletePost,
  getPostFollowing,
  getSavedPost,
  likeAndUnlike,
  saveAndUnsave,
  addComment,
};
