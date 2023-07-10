const {
  getAllConversations,
  getConversation,
  getOwnConversations,
  createConversation,
  sendMessage,
  deleteConversation,
  getConversationByMembers,
} = require("../controllers/conversationCtrl");
const { protect } = require("../middleware/authMiddleware");

const router = require("express").Router();

// get all conversation
router.route("/").get(getAllConversations).post(protect, createConversation);
router.route("/user").get(protect, getOwnConversations);
router.route("/members").get(protect, getConversationByMembers);
router
  .route("/:roomId")
  .get(getConversation)
  .put(protect, sendMessage)
  .delete(protect, deleteConversation);

module.exports = router;
