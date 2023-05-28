const {
  uploadPost,
  getPosts,
  getPostDetail,
  deletePost,
  getPostFollowing,
} = require("../controllers/postCtrl");
const { protect } = require("../middleware/authMiddleware");

const router = require("express").Router();

// get all post ,create post,
router.route("/").get(getPosts).post(protect, uploadPost);

router.route("/postfollowing").get(protect, getPostFollowing);

router.route("/:postId").get(getPostDetail).delete(protect, deletePost);

module.exports = router;
