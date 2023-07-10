const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");

// @desc    get all conversations
// @route   GET /conversation
// @access  PUBLIC
const getAllConversations = asyncHandler(async (req, res) => {
  const { members } = req.query;

  let filter = {};

  if (members) {
    const arrayMembers = members.split(",");
    filter = {
      members: {
        $all: arrayMembers.map((userId) => ({ $elemMatch: { userId } })),
      },
    };
  }

  const conversations = await Conversation.find(filter);

  res.status(200).json(conversations);
});

// @desc    get conversation by roomId
// @route   GET /conversation/:roomId
// @access  PUBLIC
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.find({ roomId: req.params.roomId });

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  res.status(200).json(conversation);
});

// @desc    get conversation by members
// @route   GET /conversation/members
// @access  PRIVATE
const getConversationByMembers = asyncHandler(async (req, res) => {
  const { members } = req.params;

  const membersWithOwnId = [...members, req.user._id.toString()];

  const conversationExist = await Conversation.findOne({
    members: {
      $all: membersWithOwnId.map((userId) => ({ $elemMatch: { userId } })),
    },
  });

  if (!conversationExist) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  res.status(200).json(conversationExist);
});

// @desc    get conversation by userId
// @route   GET /conversation/user
// @access  PRIVATE
const getOwnConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    "members.userId": req.user._id,
  }).populate({
    path: "members.userId",
    select: "_id username slug profilePicture fullname",
  });

  const filteredConversation = [...conversations].filter((conversation) => {
    const currentUser = conversation.members.find(
      (member) => member.userId._id.toString() === req.user._id.toString()
    );
    if (currentUser.isLeave === true) {
      return false;
    } else {
      return true;
    }
  });
  // get chat based when join
  const conversationsJoin = filteredConversation.map((conversation) => {
    const currentUser = conversation.members.find(
      (member) => member.userId._id.toString() === req.user._id.toString()
    );

    const members = conversation.members
      .map((member) => member.userId)
      .filter((member) => member._id.toString() !== req.user._id.toString());
    conversation.chats = conversation.chats.filter(
      (chat) => chat.createdAt >= currentUser.join
    );

    return { ...conversation._doc, members };
  });

  res.status(200).json(conversationsJoin);
});

// @desc    create conversation
// @route   POST /conversation
// @access  PRIVATE
const createConversation = asyncHandler(async (req, res) => {
  let { members, roomId } = req.body;

  if (members.length < 1) {
    res.status(400);
    throw new Error("Please add all required fields; *roomId *members");
  }

  members.push(req.user._id.toString());

  //   if conversation with the same people exist
  const conversationExist = await Conversation.findOne({
    members: { $all: members.map((userId) => ({ $elemMatch: { userId } })) },
  }).populate({
    path: "members.userId",
    select: "_id username slug profilePicture fullname",
  });

  const currentDate = Date.now();

  // join and update joinDate
  if (conversationExist) {
    conversationExist.members = conversationExist.members.map((member) => {
      if (member.userId._id.toString() === req.user._id.toString()) {
        return {
          ...member,
          join: currentDate,
          isLeave: false,
        };
      } else {
        return member;
      }
    });

    await conversationExist.save();

    const membersConvert = conversationExist.members
      .map((member) => member.userId)
      .filter((member) => member._id.toString() !== req.user._id.toString());

    res
      .status(200)
      .json({ ...conversationExist._doc, members: membersConvert });
  } else {
    //create
    const membersInObj = members.map((userId) => ({
      userId,
    }));

    let conversation = await Conversation.create({
      roomId,
      members: membersInObj,
    });

    conversation = await conversation.populate({
      path: "members.userId",
      select: "_id username slug profilePicture fullname",
    });

    const membersConvert = conversation.members
      .map((member) => member.userId)
      .filter((member) => member._id.toString() !== req.user._id.toString());

    res.status(201).json({ ...conversation._doc, members: membersConvert });
  }
});

// @desc    send message/chat
// @route   PUT /conversation/:roomId
// @access  PRIVATE
const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const conversation = await Conversation.findOne({
    roomId: req.params.roomId,
  });

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const chat = {
    userId: req.user._id,
    text: message,
  };

  conversation.chats = [...conversation.chats, chat];

  await conversation.save();

  res.status(201).json(conversation);
});

// @desc    delete conversation/chat
// @route   DELETE /conversation/:roomId
// @access  PRIVATE
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    roomId: req.params.roomId,
  });

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const currentUserIndex = conversation.members.findIndex(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  const memberStillJoin = conversation.members.filter(
    (member) =>
      member.isLeave === false &&
      member.userId.toString() !== req.user._id.toString()
  );

  if (memberStillJoin.length > 0) {
    if (currentUserIndex > -1) {
      conversation.members[currentUserIndex].isLeave = true;
    }

    await conversation.save();

    res.status(200).json(conversation);
  } else {
    await conversation.deleteOne();

    res
      .status(200)
      .json(`Conversation with roomId:${conversation.roomId} has been deleted`);
  }
});

module.exports = {
  getAllConversations,
  getConversation,
  getConversationByMembers,
  getOwnConversations,
  createConversation,
  sendMessage,
  deleteConversation,
};
