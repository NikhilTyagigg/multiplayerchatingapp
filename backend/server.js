const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;
let users = {}; // Stores connected users and positions

function isClose(pos1, pos2, threshold = 0.001) {
  const latDiff = Math.abs(pos1.lat - pos2.lat);
  const lngDiff = Math.abs(pos1.lng - pos2.lng);
  return latDiff < threshold && lngDiff < threshold;
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Assign character on login
  socket.on("login", (data) => {
    users[socket.id] = {
      id: socket.id,
      username: data.username,
      position: { lat: 51.505, lng: -0.09 },
    };
    io.emit("updateUsers", users); // Broadcast updated users
  });

  // Handle movement and detect nearby users
  socket.on("move", (newPosition) => {
    if (users[socket.id]) {
      users[socket.id].position = newPosition;

      Object.entries(users).forEach(([otherId, otherUser]) => {
        if (otherId !== socket.id && isClose(newPosition, otherUser.position)) {
          socket.emit("canChatWith", {
            userId: otherId,
            username: otherUser.username,
          });
          io.to(otherId).emit("canChatWith", {
            userId: socket.id,
            username: users[socket.id].username,
          });
        }
      });

      io.emit("updateUsers", users);
    }
  });

  // Handle chat messages
  socket.on("chat", ({ to, message }) => {
    io.to(to).emit("chatMessage", {
      from: socket.id,
      message,
    });
  });
  // Handle chat end
  socket.on("endChat", ({ to }) => {
    io.to(to).emit("chatEnded", { from: socket.id });
    socket.emit("chatEnded", { from: to });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("updateUsers", users);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
