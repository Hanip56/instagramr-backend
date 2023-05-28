const {
  getUsers,
  getUser,
  followUser,
  unfollowUser,
} = require("../controllers/userCtrl");
const { protect } = require("../middleware/authMiddleware");

const router = require("express").Router();

router.route("/").get(getUsers);
router.route("/:username").get(getUser);
router.route("/:userId/follow").patch(protect, followUser);
router.route("/:userId/unfollow").patch(protect, unfollowUser);

module.exports = router;
