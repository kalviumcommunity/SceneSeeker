import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.js";
import protect from "../middleware/auth.js";

const router = express.Router();

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password || password.length < 8) {
      return res.status(400).json({ error: "username, email, and password (min 8 chars) are required" });
    }

    // Keep existing logic, just enhance it
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashed });
    await newUser.save();

    const accessToken = signAccessToken(newUser._id);
    const refreshToken = signRefreshToken(newUser._id);
    newUser.refreshToken = hashRefreshToken(refreshToken);
    await newUser.save();

    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if ((!username && !email) || !password) {
      return res.status(400).json({ error: "username/email and password are required" });
    }

    const query = username ? { username } : { email: String(email).toLowerCase().trim() };
    const user = await User.findOne(query).select("+password");
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save();

    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh access token (rotates refresh token)
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "Missing refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (decoded?.type !== "refresh") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || !user.refreshToken) return res.status(401).json({ error: "Invalid refresh token" });

    const incomingHash = hashRefreshToken(refreshToken);
    if (incomingHash !== user.refreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshToken = hashRefreshToken(newRefreshToken);
    await user.save();

    setRefreshCookie(res, newRefreshToken);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      } catch (err) {
        decoded = null;
      }

      if (decoded?.id) {
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Protected route: return current user (no password)
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password -refreshToken");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
