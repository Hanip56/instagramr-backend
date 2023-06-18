const {
  getUsers,
  getUser,
  followUser,
  unfollowUser,
  findUser,
  editUser,
  editProfilePicture,
  removeProfilePicture,
  getFollowers,
  getFollowings,
} = require("../controllers/userCtrl");
const { protect } = require("../middleware/authMiddleware");

const router = require("express").Router();

router.route("/").get(getUsers);
router.route("/find").get(findUser);
router.route("/:slug").get(getUser);
router.route("/:slug/followers").get(getFollowers);
router.route("/:slug/followings").get(getFollowings);
router.route("/:userId/follow").patch(protect, followUser);
router.route("/:userId/unfollow").patch(protect, unfollowUser);
router.route("/edit").put(protect, editUser);
router.route("/edit/profilePicture").put(protect, editProfilePicture);
router.route("/edit/profilePicture").delete(protect, removeProfilePicture);

module.exports = router;
