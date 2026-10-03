import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  initDatabase,
  createOrUpdateUser,
  createPage,
  getPageBySlug,
  getPageById,
  getUserPages,
  togglePageActive,
  deletePage,
  addComment,
  getPageComments,
  deleteComment,
  toggleHideComment,
  toggleVote,
  addReport,
  saveAiAnalysis,
  getAiAnalysis
} from "./server/db.ts";
import {
  authMiddleware,
  requireAuth,
  createSessionToken,
  parseGoogleCredential,
  getAnonymousIdentifier
} from "./server/auth.ts";
import { checkHarmfulContent, checkRateLimit } from "./server/moderation.ts";
import { analyzeCommentsWithAI } from "./server/ai.ts";
dotenv.config();
const app = express();
const PORT = 3e3;
const isProduction = process.env.NODE_ENV === "production";
app.use(express.json());
app.use(cookieParser());
app.use(cors());
await initDatabase();
console.log("Database initialized successfully.");
app.use("/api", authMiddleware);
app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    appUrl: process.env.APP_URL || ""
  });
});
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u0631\u0645\u0632 \u0645\u0635\u0627\u062F\u0642\u0629 \u062C\u0648\u062C\u0644." });
      return;
    }
    const payload = parseGoogleCredential(credential);
    if (!payload || !payload.sub) {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629." });
      return;
    }
    const user = createOrUpdateUser({
      id: "usr_" + crypto.randomBytes(6).toString("hex"),
      google_id: payload.sub,
      name: payload.name,
      email: payload.email,
      profile_image: payload.picture
    });
    const token = createSessionToken(user.id);
    res.cookie("baseera_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1e3
    });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644." });
  }
});
app.post("/api/auth/firebase-login", async (req, res) => {
  try {
    const { uid, email, name, photoURL } = req.body;
    if (!uid) {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0633\u0627\u0628 Google \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629." });
      return;
    }
    const userName = name || email?.split("@")[0] || "User";
    const userEmail = email || `${uid}@firebase.user`;
    const userImage = photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
    const user = createOrUpdateUser({
      id: "usr_" + crypto.randomBytes(6).toString("hex"),
      google_id: uid,
      name: userName,
      email: userEmail,
      profile_image: userImage
    });
    const token = createSessionToken(user.id);
    res.cookie("baseera_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1e3
    });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Firebase login error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644." });
  }
});
app.post("/api/auth/quick-login", (req, res) => {
  try {
    const { name, email, avatarIndex } = req.body;
    const userName = name?.trim() || "\u0633\u0627\u0631\u0629 \u0627\u0644\u0634\u0645\u0631\u064A (Sara)";
    const userEmail = email?.trim() || "sara.user@gmail.com";
    const avatars = [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    ];
    const image = avatars[(avatarIndex || 0) % avatars.length];
    const googleId = "quick_google_" + crypto.createHash("md5").update(userEmail).digest("hex").substring(0, 12);
    const user = createOrUpdateUser({
      id: "usr_" + crypto.randomBytes(6).toString("hex"),
      google_id: googleId,
      name: userName,
      email: userEmail,
      profile_image: image
    });
    const token = createSessionToken(user.id);
    res.cookie("baseera_session", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1e3
    });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("Quick login error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639." });
  }
});
app.get("/api/auth/me", (req, res) => {
  if (!req.user) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      profile_image: req.user.profile_image,
      created_at: req.user.created_at
    }
  });
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("baseera_session");
  res.json({ success: true });
});
app.post("/api/pages", requireAuth, (req, res) => {
  try {
    const { question, custom_slug } = req.body;
    if (!question || typeof question !== "string" || question.trim().length < 5) {
      res.status(400).json({ error: "\u0627\u0644\u0633\u0624\u0627\u0644 \u064A\u062C\u0628 \u0623\u0646 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 5 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644." });
      return;
    }
    if (question.trim().length > 300) {
      res.status(400).json({ error: "\u0637\u0648\u0644 \u0627\u0644\u0633\u0624\u0627\u0644 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u064A\u062A\u062C\u0627\u0648\u0632 300 \u062D\u0631\u0641." });
      return;
    }
    let slug = "";
    if (custom_slug && typeof custom_slug === "string" && custom_slug.trim()) {
      let sanitized = custom_slug.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 40);
      if (!sanitized || sanitized.replace(/-/g, "").length < 2) {
        slug = "q-" + crypto.randomBytes(4).toString("hex");
      } else {
        slug = sanitized;
        const existing = getPageBySlug(slug) || getPageBySlug(decodeURIComponent(slug));
        if (existing) {
          slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
        }
      }
    } else {
      slug = "q-" + crypto.randomBytes(4).toString("hex");
    }
    const chosenMax = [25, 50, 100].includes(Number(req.body.max_comments)) ? Number(req.body.max_comments) : 50;
    const pageId = "pg_" + crypto.randomBytes(6).toString("hex");
    const page = createPage({
      id: pageId,
      user_id: req.user.id,
      question: question.trim(),
      slug,
      max_comments: chosenMax
    });
    res.json({ success: true, page });
  } catch (err) {
    console.error("Error creating page:", err);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0641\u062D\u0629." });
  }
});
app.get("/api/pages", requireAuth, (req, res) => {
  try {
    const pages = getUserPages(req.user.id);
    res.json({ pages });
  } catch (err) {
    console.error("Error fetching user pages:", err);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062C\u0644\u0628 \u0627\u0644\u0635\u0641\u062D\u0627\u062A." });
  }
});
app.get("/api/pages/:slug", (req, res) => {
  try {
    const rawSlug = req.params.slug;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {
    }
    const page = getPageBySlug(decodedSlug) || getPageBySlug(rawSlug);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647\u0627." });
      return;
    }
    res.json({
      page: {
        id: page.id,
        user_id: page.user_id,
        question: page.question,
        slug: page.slug,
        max_comments: page.max_comments || 50,
        comments_count: page.comments_count,
        remaining_comments: Math.max(0, (page.max_comments || 50) - page.comments_count),
        is_active: page.is_active === 1,
        created_at: page.created_at,
        owner_name: page.owner_name,
        owner_image: page.owner_image
      }
    });
  } catch (err) {
    console.error("Error fetching page:", err);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645." });
  }
});
app.patch("/api/pages/:id/toggle", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const success = togglePageActive(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0623\u0648 \u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    const updated = getPageById(id);
    res.json({ success: true, is_active: updated?.is_active === 1 });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0635\u0641\u062D\u0629." });
  }
});
app.delete("/api/pages/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const success = deletePage(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0623\u0648 \u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0635\u0641\u062D\u0629." });
  }
});
app.get("/api/pages/:id/comments", (req, res) => {
  try {
    const { id } = req.params;
    const sortBy = req.query.sort === "newest" ? "newest" : "votes";
    const voterId = getAnonymousIdentifier(req);
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    const isOwner = req.user && req.user.id === page.user_id;
    const comments = getPageComments(id, voterId, sortBy, isOwner);
    res.json({
      comments,
      isOwner,
      total: comments.length,
      max_comments: page.max_comments,
      remaining: Math.max(0, page.max_comments - comments.length)
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A." });
  }
});
app.post("/api/pages/:id/comments", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!req.user) {
      res.status(401).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 Google \u0644\u0641\u062A\u062D \u0645\u064A\u0632\u0629 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
      return;
    }
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u0645\u0637\u0644\u0648\u0628." });
      return;
    }
    const modCheck = checkHarmfulContent(content);
    if (!modCheck.safe) {
      res.status(400).json({ error: modCheck.reason });
      return;
    }
    const anonymousIdentifier = getAnonymousIdentifier(req);
    const rateCheck = checkRateLimit(anonymousIdentifier, id, 5, 10);
    if (!rateCheck.allowed) {
      res.status(429).json({
        error: `\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 ${rateCheck.waitSeconds} \u062B\u0627\u0646\u064A\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u062A\u0639\u0644\u064A\u0642 \u0622\u062E\u0631 \u0645\u0646\u0639\u0627\u064B \u0644\u0644\u062A\u0643\u0631\u0627\u0631.`
      });
      return;
    }
    const commentId = "cmt_" + crypto.randomBytes(6).toString("hex");
    const result = addComment({
      id: commentId,
      page_id: id,
      anonymous_identifier: anonymousIdentifier,
      content: content.trim()
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      success: true,
      comment: {
        id: result.comment.id,
        page_id: result.comment.page_id,
        content: result.comment.content,
        votes_count: result.comment.votes_count,
        created_at: result.comment.created_at,
        has_voted: false
      }
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
  }
});
app.delete("/api/comments/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteComment(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
  }
});
app.patch("/api/comments/:id/hide", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const success = toggleHideComment(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
  }
});
app.post("/api/comments/:id/vote", (req, res) => {
  try {
    const { id } = req.params;
    const voterIdentifier = getAnonymousIdentifier(req);
    const voteId = "vt_" + crypto.randomBytes(6).toString("hex");
    const result = toggleVote({
      vote_id: voteId,
      comment_id: id,
      voter_identifier: voterIdentifier
    });
    res.json({
      success: true,
      voted: result.voted,
      votes_count: result.votes_count
    });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0635\u0648\u064A\u062A." });
  }
});
app.post("/api/comments/:id/report", (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const allowedReasons = ["abuse", "threat", "bullying", "inappropriate", "personal_info", "other"];
    const chosenReason = allowedReasons.includes(reason) ? reason : "other";
    const reporterIdentifier = getAnonymousIdentifier(req);
    const reportId = "rep_" + crypto.randomBytes(6).toString("hex");
    addReport({
      id: reportId,
      comment_id: id,
      reason: chosenReason,
      reporter_identifier: reporterIdentifier
    });
    res.json({ success: true, message: "\u0634\u0643\u0631\u0627\u064B \u0644\u0643\u060C \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0628\u0644\u0627\u063A \u0648\u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u062A\u0647." });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0644\u0627\u063A." });
  }
});
app.get("/api/pages/:id/analysis", (req, res) => {
  try {
    const { id } = req.params;
    const cached = getAiAnalysis(id);
    if (!cached) {
      res.json({ hasAnalysis: false, analysis: null });
      return;
    }
    res.json({
      hasAnalysis: true,
      analysis: JSON.parse(cached.analysis_json),
      analyzed_at: cached.analyzed_at,
      comments_analyzed_count: cached.comments_analyzed_count
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0644\u064A\u0644." });
  }
});
app.post("/api/pages/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    const comments = getPageComments(id, void 0, "votes", false);
    if (comments.length === 0) {
      res.status(400).json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0628\u0639\u062F \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u062D\u0644\u064A\u0644." });
      return;
    }
    const commentTexts = comments.map((c) => c.content);
    const analysis = await analyzeCommentsWithAI(page.question, commentTexts);
    saveAiAnalysis(id, JSON.stringify(analysis), comments.length);
    res.json({
      success: true,
      analysis,
      analyzed_at: (/* @__PURE__ */ new Date()).toISOString(),
      comments_analyzed_count: comments.length
    });
  } catch (err) {
    console.error("AI Analysis error:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u062C\u0631\u0627\u0621 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A." });
  }
});
if (!isProduction) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    try {
      const templatePath = path.resolve(process.cwd(), "index.html");
      let template = fs.readFileSync(templatePath, "utf-8");
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  const distDir = path.resolve(process.cwd(), "dist");
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Baseera AI Server running on port ${PORT}`);
});
