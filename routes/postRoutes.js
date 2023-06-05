const {
  uploadPost,
  getPosts,
  getPostDetail,
  deletePost,
  getPostFollowing,
  likeAndUnlike,
  saveAndUnsave,
  addComment,
} = require("../controllers/postCtrl");
const { protect } = require("../middleware/authMiddleware");

const router = require("express").Router();

// get all post ,create post,
router.route("/").get(getPosts).post(protect, uploadPost);

router.route("/postfollowing").get(protect, getPostFollowing);

router.route("/:postId").get(getPostDetail).delete(protect, deletePost);

// like and unlike post
router.route("/:postId/likeandunlike").patch(protect, likeAndUnlike);

// like and unlike post
router.route("/:postId/saveandunsave").patch(protect, saveAndUnsave);

// comment post
router.route("/:postId/addcomment").patch(protect, addComment);

module.exports = router;
