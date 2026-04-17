import http from "node:http";
import app from "./app.js";
import { Server } from "socket.io";

const port = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.emit("tracker:status", {
    message: "Live updates connected",
    at: new Date().toISOString()
  });
});

server.listen(port, () => {
  console.log(`Resource Pulse is running on http://localhost:${port}`);
});
