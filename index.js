require("dotenv").config();
require("colors");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { corsOptions } = require("./config/corsOptions");
const { credentials } = require("./middleware/credentials");
const { errorHandler } = require("./middleware/errorMiddleware");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./config/db");

const port = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
connectDB();

// socket io
const io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});
io.on("connection", (socket) => {
  const id = socket.handshake.query.id;
  socket.join(id);

  socket.on("send-message", ({ roomId, recipients, sender, text }, cb) => {
    const currentDate = Date.now();
    recipients.forEach((recipient) => {
      // const newRecipients = recipients.filter((r) => r !== recipient);
      // newRecipients.push(id);
      socket.broadcast.to(recipient._id).emit("receive-message", {
        roomId,
        recipients,
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
});

// if the server allows the request to include credentials add this
app.use(credentials);

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static("./public"));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/post", require("./routes/postRoutes"));

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server is listening on port: ${port}`.yellow.underline);
});
