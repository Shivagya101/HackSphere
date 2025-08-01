import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// GitHub OAuth routes
router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email", "repo"] })
);

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id, githubId: req.user.githubId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error("Auth callback error:", error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
);

// Get current user
router.get("/auth/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      githubId: user.githubId,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      email: user.email,
      joinedRooms: user.joinedRooms,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
});

// Logout
router.post("/auth/logout", (req, res) => {
  if (typeof req.logout === "function") {
    req.logout(() => {
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  } else {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  }
});

export default router;
