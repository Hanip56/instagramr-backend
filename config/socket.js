const IO = require("socket.io");
const allowOrigins = require("./allowOrigins");

let users = [];

const addUser = (userId) => {
  if (!userId) {
    return;
  }
  !users.includes(userId) && users.push(userId);
};

const removeUser = (userId) => {
  users = users.filter((uId) => uId !== userId);
};

const connectSocket = (server) => {
  const io = IO(server, {
    cors: {
      origin: allowOrigins,
    },
  });

  io.on("connection", (socket) => {
    const id = socket.handshake.query.id;
    socket.join(id);

    socket.on("addUser", () => {
      addUser(id);
      io.emit("getOnlineUsers", users);
    });
    socket.on("send-message", ({ roomId, recipients, sender, text }, cb) => {
      const currentDate = Date.now();
      recipients.forEach((recipient) => {
        const members = [...recipients, sender].filter(
          (member) => member._id !== recipient._id
        );
        socket.broadcast.to(recipient._id).emit("receive-message", {
          roomId,
          members,
          sender,
          text,
          createdAt: currentDate,
        });
      });

      // Assuming recipient received the message successfully
      if (cb) {
        cb({ success: true, createdAt: currentDate });
      }
    });

    //  when  disconnect
    socket.on("disconnect", () => {
      removeUser(id);
      io.emit("getOnlineUsers", users);
    });
  });
};

module.exports = {
  connectSocket,
};
