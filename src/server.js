import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import { Server } from "socket.io";
import { connectDatabase, isDatabaseConfigured } from "./config/database.js";

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

async function startServer() {
  try {
    if (isDatabaseConfigured()) {
      await connectDatabase();
      console.log("MongoDB connected successfully.");
    } else {
      console.log("MONGODB_URI not set. Using local JSON fallback storage.");
    }

    server.listen(port, () => {
      console.log(`Resource Pulse is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
