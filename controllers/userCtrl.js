const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const uploadProfilePicture = require("../utils/uploadProfilePicture");
const multer = require("multer");
const fs = require("fs");
const { promisify } = require("util");

// @desc    Get all user
// @route   POST /api/user
// @access  PUBLIC
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  res.status(200).json({ users });
});

// @desc    Get one user
// @route   GET /api/user/:slug
// @access  PUBLIC
const getUser = asyncHandler(async (req, res) => {
  const slug = req.params.slug;

  const user = await User.findOne({ slug })
    // .populate({
    //   path: "followings followers",
    //   select: "_id username profilePicture fullname slug",
    // })
    .populate({
      path: "saved posts",
    })
    .populate({
      path: "saved posts",
      populate: {
        path: "postedBy likes savedBy",
        select: "_id username profilePicture slug",
      },
    })
    .populate({
      path: "saved posts",
      populate: {
        path: "comments",
        populate: {
          path: "user",
          select: "_id username profilePicture slug",
        },
      },
    });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(user);
});

// @desc    Get followers detail
// @route   GET /api/user/:slug/followers
// @access  PUBLIC
const getFollowers = asyncHandler(async (req, res) => {
  const user = await User.findOne({ slug: req.params.slug });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const followers = await User.find({
    _id: { $in: user.followers },
  }).select("_id username profilePicture fullname slug");

  res.status(200).json(followers);
});

// @desc    Get followings detail
// @route   GET /api/user/:slug/followings
// @access  PUBLIC
const getFollowings = asyncHandler(async (req, res) => {
  const user = await User.findOne({ slug: req.params.slug });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const followings = await User.find({
    _id: { $in: user.followings },
  }).select("_id username profilePicture fullname slug");

  res.status(200).json(followings);
});

// @desc    Follow a user
// @route   PUT /api/user/:userId/follow
// @access  PRIVATE
const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { _id } = req.user;

  if (userId === _id.toString()) {
    res.status(403);
    throw new Error("Action Forbidden");
  }

  const currentUser = await User.findById(_id);
  const targetUser = await User.findById(userId);

  if (!currentUser.followings.includes(userId)) {
    await targetUser.updateOne({ $push: { followers: _id } });
    await currentUser.updateOne({ $push: { followings: userId } });

    res.status(200).json({
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        profilePicture: targetUser.profilePicture,
      },
      message: "User Followed",
    });
  } else {
    res.status(400).json("You already followed this account");
  }
});

// @desc    Unfollow a user
// @route   PUT /api/user/:userId/unfollow
// @access  PRIVATE
const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { _id } = req.user;

  if (!userId) {
    res.status(404);
    throw new Error("User not found");
  }

  if (userId === _id.toString()) {
    res.status(403);
    throw new Error("Action Forbidden");
  }

  const currentUser = await User.findById(_id);
  const targetUser = await User.findById(userId);

  if (currentUser.followings.includes(userId)) {
    await targetUser.updateOne({ $pull: { followers: _id } });
    await currentUser.updateOne({ $pull: { followings: userId } });

    res.status(200).json({
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        profilePicture: targetUser.profilePicture,
      },
      message: "Unfollowed Succesfully",
    });
  } else {
    res.status(400).json("You already unfollowed this account");
  }
});

// @desc    find user
// @route   GET /api/user/find?search=#&&limit=#
// @access  PUBLIC
const findUser = asyncHandler(async (req, res) => {
  const search = req.query.search;
  const limit = req.query.limit || 30;

  if (!search) {
    res.status(200).json([]);
    return;
  }

  try {
    const users = await User.find({
      username: { $regex: search, $options: "i" },
    })
      .select(
        "_id username fullname profilePicture followers totalFollowers slug"
      )
      .limit(limit);

    res.status(200).json(users);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

// @desc    edit user
// @route   PUT /api/user/edit
// @access  PRIVATE
const editUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { fullname, username, profileBio, email } = req.body;

  if (fullname) {
    user.fullname = fullname;
  }
  if (username) {
    user.username = username;
  }
  if (profileBio) {
    user.profileBio = profileBio;
  }
  if (email) {
    user.email = email;
  }

  await user.save();

  res.status(201).json(user);
});

// @desc    edit user
// @route   PUT /api/user/edit/profilePicture
// @access  PRIVATE
const editProfilePicture = asyncHandler(async (req, res, next) => {
  uploadProfilePicture(req, res, async function (err) {
    if (err instanceof multer.MulterError || err) {
      res.status(500);
      return next(err);
    }

    if (!req.file) {
      res.status(400);
      return next(new Error("Error no file selected"));
    }

    try {
      const user = await User.findById(req.user._id);
      const oldProfilePicture = user.profilePicture;

      user.profilePicture = req.file.filename;
      await user.save();

      if (oldProfilePicture !== "default_profile_picture.png") {
        fs.existsSync("./public/" + oldProfilePicture) &&
          fs.unlinkSync("./public/" + oldProfilePicture);
      }

      res.status(201).json(user);
    } catch (error) {
      fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
      res.status(500);
      return next(error);
    }
  });
});

// @desc    turn the profile picture to default
// @route   DELETE /api/user/edit/profilePicture
// @access  PRIVATE
const removeProfilePicture = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const currentProfilePicture = user.profilePicture;

  if (user.profilePicture !== "default_profile_picture.png") {
    if (fs.existsSync("./public/" + currentProfilePicture)) {
      await fs.promises.unlink("./public/" + currentProfilePicture);

      user.profilePicture = "default_profile_picture.png";

      await user.save();
    }
  }

  res.status(201).json({ message: "profile picture removed" });
});

module.exports = {
  getUsers,
  getUser,
  getFollowers,
  getFollowings,
  followUser,
  unfollowUser,
  findUser,
  editUser,
  editProfilePicture,
  removeProfilePicture,
};
