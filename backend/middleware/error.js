import AppError from "../utils/AppError.js";

export default function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;

  // AppError (operational)
  if (err instanceof AppError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose duplicate key
  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Already exists",
    });
  }

  // Mongoose validation error
  if (err?.name === "ValidationError") {
    const fields = Object.values(err.errors || {}).map((e) => ({
      field: e?.path,
      message: e?.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation error",
      fields,
    });
  }

  // JWT error
  if (err?.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Fallback
  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
}
