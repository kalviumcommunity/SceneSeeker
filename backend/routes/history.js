import express from "express";
import mongoose from "mongoose";
import protect from "../middleware/auth.js";
import SearchHistory from "../models/SearchHistory.js";

const router = express.Router();

router.use(protect);

// GET / - paginated history for authenticated user
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(rawLimit || 10, 1), 50);
    const skip = (page - 1) * limit;

    const userId = req.user;

    const [total, data] = await Promise.all([
      SearchHistory.countDocuments({ userId }),
      SearchHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({ data, page, limit, total, totalPages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /:id - delete one entry (must belong to user)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const doc = await SearchHistory.findOneAndDelete({ _id: id, userId: req.user });
    if (!doc) return res.status(404).json({ error: "History entry not found" });

    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE / - delete all history for this user
router.delete("/", async (req, res) => {
  try {
    const result = await SearchHistory.deleteMany({ userId: req.user });
    return res.json({ deletedCount: result.deletedCount || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
