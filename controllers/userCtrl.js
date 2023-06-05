const User = require("../models/User");
const asyncHandler = require("express-async-handler");

// @desc    Get all user
// @route   POST /api/user
// @access  PUBLIC
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  res.status(200).json({ users });
});

// @desc    Get one user
// @route   GET /api/user/:username
// @access  PUBLIC
const getUser = asyncHandler(async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username })
    .populate({
      path: "followings followers",
      select: "_id username profilePicture fullname",
    })
    .populate({
      path: "saved posts",
    })
    .populate({
      path: "saved posts",
      populate: {
        path: "postedBy likes savedBy",
        select: "_id username profilePicture",
      },
    })
    .populate({
      path: "saved posts",
      populate: {
        path: "comments",
        populate: {
          path: "user",
          select: "_id username profilePicture",
        },
      },
    });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(user);
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
      .select("_id username fullname profilePicture followers totalFollowers")
      .limit(limit);

    res.status(200).json(users);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

module.exports = {
  getUsers,
  getUser,
  followUser,
  unfollowUser,
  findUser,
};
