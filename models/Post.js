const mongoose = require("mongoose");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const sharp = require("sharp");
const fs = require("fs");

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

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
    thumbnail: { type: String },
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

postSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    const currentPost = this;
    if (this.contentType === "video") {
      const oldFilePath = `./public/thumbnail/${currentPost?.thumbnail}`;
      const filename = `${currentPost.content[0]}_thumbnail.png`;
      const path = `./public/${currentPost.content[0]}`;

      ffmpeg(path)
        .on("end", async function () {
          currentPost.thumbnail = filename;
          fs.existsSync(oldFilePath) && fs.unlinkSync(oldFilePath);
          return next();
        })
        .on("error", function (err) {
          console.error(err);
          return next(err);
        })
        .screenshots({
          // Will take screenshots at 20%, 40%, 60% and 80% of the video
          count: 1,
          filename,
          folder: "./public/thumbnail",
        });
    } else if (this.contentType === "image") {
      const path = `./public/${currentPost.content[0]}`;
      const filename = `${currentPost.content[0]}_thumbnail.webp`;

      sharp(path)
        .resize(400, 400)
        .toFormat("webp")
        .toFile(`./public/thumbnail/${filename}`, (err, info) => {
          if (err) {
            return next(err);
          } else {
            currentPost.thumbnail = filename;
            return next();
          }
        });
    }
  }
});

module.exports = mongoose.model("Post", postSchema);
