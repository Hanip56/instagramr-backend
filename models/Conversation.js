const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    required: true,
  },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      join: {
        type: Date,
        default: Date.now,
      },
      isLeave: {
        type: Boolean,
        default: false,
      },
    },
  ],
  chats: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("Conversation", conversationSchema);
