import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import historyRoutes from "./routes/history.js";
import movieRoutes from "./routes/movies.js";
import errorHandler from "./middleware/error.js";
import AppError from "./utils/AppError.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global rate limit (100 requests / minute)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/movies", movieRoutes);

// Placeholder: history, movies routes go here

// 404 handler for unmatched routes
app.all("*", (req, res, next) => {
  next(new AppError(`Not found: ${req.originalUrl}`, 404));
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err);
  } finally {
    server.close(() => process.exit(0));
  }
});
