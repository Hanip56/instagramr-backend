const mongoose = require("mongoose");

const postSchema = mongoose.Schema(
  {
    contentType: {
      type: String,
    },
    caption: {
      type: String,
    },
    content: {
      type: [String],
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        comment: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

postSchema.virtual("totalLikes").get(function () {
  return this.likes.length;
});
postSchema.virtual("totalComments").get(function () {
  return this.comments.length;
});

postSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Post", postSchema);
