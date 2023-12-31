const mongoose = require("mongoose");
const slugify = require("slugify");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema(
  {
    // for auth
    refreshToken: [{ type: String, select: false }],
    fullname: {
      type: String,
      required: [true, "Please add a full name"],
    },
    username: {
      type: String,
      required: [true, "Please provide a username"],
      unique: true,
    },
    slug: String,
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide password - min 6"],
      minlength: 6,
      select: false,
    },
    // for profile detail
    profilePicture: {
      type: String,
      default: "default_profile_picture.png",
    },
    profileBio: String,
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    followings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    birthday: Date,
    address: String,
  },
  { timestamps: true }
);

userSchema.virtual("totalPost").get(function () {
  return this.posts?.length;
});
userSchema.virtual("totalFollowers").get(function () {
  return this.followers?.length;
});
userSchema.virtual("totalFollowings").get(function () {
  return this.followings?.length;
});

userSchema.set("toJSON", { virtuals: true });

const slugifyOptions = {
  replacement: "_",
  lower: true,
  strict: true,
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified("username")) {
    this.slug = slugify(this.username, slugifyOptions);
  }
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.getAccessToken = function () {
  return jwt.sign({ id: this.id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE,
  });
};

userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this.id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
  });
};

module.exports = mongoose.model("User", userSchema);
