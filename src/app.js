import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readingRoutes from "./routes/reading-routes.js";
import analyticsRoutes from "./routes/analytics-routes.js";
import { requestLogger } from "./middleware/request-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "resource-pulse-demo-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 6,
      sameSite: "lax"
    }
  })
);
app.use(requestLogger);

app.get("/api/v1/health", (req, res) => {
  req.session.views = (req.session.views || 0) + 1;
  res.json({
    success: true,
    message: "API healthy",
    sessionViews: req.session.views,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/readings", readingRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Unexpected server error"
  });
});

export default app;
