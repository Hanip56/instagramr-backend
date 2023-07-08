const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");

// @desc    get all conversations
// @route   GET /conversation
// @access  PUBLIC
const getAllConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find();

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

// @desc    get conversation by userId
// @route   GET /conversation/user
// @access  PRIVATE
const getOwnConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    "members.userId": req.user._id,
  });

  // get chat based when join
  const conversationsJoin = [...conversations].map((conversation) => {
    const currentUser = conversation.members.find(
      (member) => member.userId.toString() === req.user._id.toString()
    );
    conversation.chats = conversation.chats.filter(
      (chat) => chat.createdAt >= currentUser.join
    );

    return conversation;
  });

  res.status(200).json(conversationsJoin);
});

// @desc    create conversation
// @route   POST /conversation
// @access  PRIVATE
const createConversation = asyncHandler(async (req, res) => {
  const { roomId, members, message } = req.body;

  if (!roomId || members.length < 1 || !message) {
    res.status(400);
    throw new Error("Please add all required fields; *roomId *members *chats");
  }

  const membersInObj = members.map((userId) => ({ userId }));

  //   if the same people conversation exist
  const conversationExist = await Conversation.findOne({
    members: { $all: members.map((userId) => ({ $elemMatch: { userId } })) },
  });
  const chat = {
    userId: req.user._id,
    text: message,
  };

  if (conversationExist) {
    conversationExist.members = conversationExist.members.map((member) => {
      if (member.userId.toString() === req.user._id.toString()) {
        return {
          ...member,
          join: Date.now(),
          isLeave: false,
        };
      } else {
        return member;
      }
    });

    conversationExist.chats = [...conversationExist.chats, chat];

    await conversationExist.save();

    res.status(200).json(conversationExist);
  } else {
    const conversation = await Conversation.create({
      roomId,
      members: membersInObj,
      chats: [chat],
    });

    res.status(201).json(conversation);
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
  getOwnConversations,
  createConversation,
  sendMessage,
  deleteConversation,
};
