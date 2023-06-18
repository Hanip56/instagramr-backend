const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile_" + uniqueSuffix + "-" + file.originalname);
  },
});

const uploadProfilePicture = multer({
  storage,
  limits: { fileSize: 5000000 },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}).single("profilePicture");

// checking file
const checkFileType = (file, cb) => {
  // allowed ext
  const fileTypes = /jpg|jpeg|png/;
  // check ext
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // check mimetype
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Error: jpg/jpeg/png file only"));
  }
};

module.exports = uploadProfilePicture;
