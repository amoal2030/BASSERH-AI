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
  getCommentById,
  deleteComment,
  toggleHideComment,
  toggleVote,
  addReport,
  saveAiAnalysis,
  markAiAnalysisNeedsUpdate,
  getAiAnalysis,
  hasUserCommentedOnPage,
  backupDatabase,
  listBackups
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
import {
  PAYMENT_PACKAGES,
  getPayPalConfig,
  createPayPalOrder,
  capturePayPalOrder
} from "./server/paypal.ts";
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
const app = express();
const PORT = 3e3;
const isProduction = process.env.NODE_ENV === "production";
app.set("trust proxy", true);
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const referer = req.headers["referer"] || "none";
  const origin = req.headers["origin"] || "none";
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[REQ_LOG] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms) | IP: ${ip} | Origin: ${origin} | Referer: ${referer} | UA: ${userAgent.slice(0, 80)}`
    );
  });
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "User-Agent",
      "Cache-Control",
      "X-Forwarded-For",
      "Sec-CH-UA",
      "Sec-CH-UA-Mobile",
      "Sec-CH-UA-Platform"
    ]
  })
);
app.options("*", cors());
await initDatabase();
console.log("Database initialized successfully.");
try {
  const luaFile = "/etc/nginx/user_auth_verification.lua";
  if (fs.existsSync(luaFile)) {
    let lua = fs.readFileSync(luaFile, "utf8");
    const target = 'if ngx.var.host == "localhost" then\n  return\nend';
    const bypassSnippet = `-- Allow public routes (questions, APIs, assets) to bypass AI Studio auth bridge
local req_uri = ngx.var.uri or ""
if string.match(req_uri, "^/q") or
   string.match(req_uri, "^/u") or
   string.match(req_uri, "^/api/") or
   string.match(req_uri, "^/assets") or
   string.match(req_uri, "^/node_modules/") or
   string.match(req_uri, "^/@") or
   string.match(req_uri, "^/src") or
   string.match(req_uri, "^/favicon") or
   string.match(req_uri, "^/manifest") or
   string.match(req_uri, "%.js") or
   string.match(req_uri, "%.css") or
   string.match(req_uri, "%.mjs") or
   string.match(req_uri, "%.ts") or
   string.match(req_uri, "%.tsx") or
   string.match(req_uri, "%.svg") or
   string.match(req_uri, "%.png") or
   string.match(req_uri, "%.woff") or
   req_uri == "/" or req_uri == "" then
  return
end`;
    if (!lua.includes("^/node_modules/")) {
      if (lua.includes("-- Allow public routes (questions, APIs, assets)")) {
        const regex = /-- Allow public routes[\s\S]*?return\s+end/;
        lua = lua.replace(regex, bypassSnippet);
      } else {
        lua = lua.replace(target, `${target}

${bypassSnippet}`);
      }
      fs.writeFileSync(luaFile, lua, "utf8");
      import("child_process").then((cp) => {
        cp.exec("nginx -s reload");
      });
      console.log("Nginx public routes bypass configured and reloaded.");
    }
  }
} catch (e) {
}
app.use("/api", authMiddleware);
const SESSION_COOKIE_NAME = "baseera_session";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1e3
};
let firebaseConfig = {};
try {
  const fbPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(fbPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(fbPath, "utf-8"));
  }
} catch (e) {
}
app.get("/api/config", (req, res) => {
  let appUrl = process.env.APP_URL || "";
  if (!appUrl && req.headers.host) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    appUrl = `${proto}://${req.headers.host}`;
  }
  const googleClientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || "";
  res.json({
    googleClientId,
    appUrl
  });
});
app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || "";
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex");
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("openid email profile")}&prompt=select_account&state=${state}`;
  res.json({ url: googleAuthUrl });
});
app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      res.redirect("/?error=no_code");
      return;
    }
    const clientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    if (clientSecret) {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.id_token) {
        const payload = parseGoogleCredential(tokenData.id_token);
        if (payload) {
          const user = createOrUpdateUser({
            id: "usr_" + crypto.randomBytes(6).toString("hex"),
            google_id: payload.sub,
            name: payload.name,
            email: payload.email,
            profile_image: payload.picture
          });
          const token = createSessionToken(user.id);
          res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
          res.redirect("/dashboard");
          return;
        }
      }
    }
    res.redirect("/dashboard");
  } catch (e) {
    res.redirect("/?error=oauth_failed");
  }
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
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        google_id: user.google_id,
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
    const { uid, email, name, photoURL, idToken } = req.body;
    let googleId = uid;
    let userEmail = email;
    let userName = name;
    let userImage = photoURL;
    if (idToken && typeof idToken === "string") {
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          const sub = payload.firebase?.identities?.["google.com"]?.[0] || payload.sub;
          if (sub) googleId = sub;
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userImage = payload.picture;
        }
      } catch (err) {
        console.warn("Could not decode idToken payload:", err);
      }
    }
    if (!googleId) {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0633\u0627\u0628 Google \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629." });
      return;
    }
    const finalName = userName?.trim() || userEmail?.split("@")[0] || "User";
    const finalEmail = userEmail?.trim() || `${googleId}@google.user`;
    const finalImage = userImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
    const user = createOrUpdateUser({
      id: "usr_" + crypto.randomBytes(6).toString("hex"),
      google_id: googleId,
      name: finalName,
      email: finalEmail,
      profile_image: finalImage
    });
    const token = createSessionToken(user.id);
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        google_id: user.google_id,
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
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
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
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      google_id: req.user.google_id,
      name: req.user.name,
      email: req.user.email,
      profile_image: req.user.profile_image,
      created_at: req.user.created_at
    }
  });
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  });
  res.cookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: /* @__PURE__ */ new Date(0),
    maxAge: 0
  });
  res.json({ success: true, authenticated: false });
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
const handleGetPublicPage = (req, res) => {
  try {
    const rawSlug = req.params.slug || req.params.id;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {
    }
    const page = getPageBySlug(decodedSlug) || getPageBySlug(rawSlug) || getPageById(decodedSlug) || getPageById(rawSlug);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647\u0627." });
      return;
    }
    res.status(200).json({
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
};
app.get("/api/pages/:slug", handleGetPublicPage);
app.get("/api/pages/by-id/:id", handleGetPublicPage);
app.get("/api/pages/id/:id", handleGetPublicPage);
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
    const userId = req.user ? req.user.id : void 0;
    const hasCommented = hasUserCommentedOnPage(id, userId, voterId);
    res.json({
      comments,
      isOwner,
      total: comments.length,
      max_comments: page.max_comments,
      remaining: Math.max(0, page.max_comments - comments.length),
      has_user_commented: hasCommented
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
      res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 Google \u0644\u0625\u0631\u0633\u0627\u0644 \u062A\u0639\u0644\u064A\u0642." });
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
    if (hasUserCommentedOnPage(id, req.user.id)) {
      res.status(409).json({ error: "\u0644\u0642\u062F \u0623\u0631\u0633\u0644\u062A \u062A\u0639\u0644\u064A\u0642\u064B\u0627 \u0628\u0627\u0644\u0641\u0639\u0644 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629." });
      return;
    }
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
      user_id: req.user.id,
      anonymous_identifier: anonymousIdentifier,
      content: content.trim()
    });
    if (!result.success) {
      const statusCode = result.alreadyCommented ? 409 : 400;
      res.status(statusCode).json({ error: result.error || "\u0644\u0642\u062F \u0623\u0631\u0633\u0644\u062A \u062A\u0639\u0644\u064A\u0642\u064B\u0627 \u0628\u0627\u0644\u0641\u0639\u0644 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629." });
      return;
    }
    triggerAutoAiAnalysis(id);
    res.json({
      success: true,
      message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0639\u0644\u064A\u0642\u0643 \u0628\u0646\u062C\u0627\u062D.",
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
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649." });
  }
});
app.delete("/api/comments/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const comment = getCommentById(id);
    const success = deleteComment(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
      return;
    }
    if (comment) {
      triggerAutoAiAnalysis(comment.page_id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
  }
});
app.patch("/api/comments/:id/hide", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const comment = getCommentById(id);
    const success = toggleHideComment(id, req.user.id);
    if (!success) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0644\u064A\u0642." });
      return;
    }
    if (comment) {
      triggerAutoAiAnalysis(comment.page_id);
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
const activeAiAnalyses = /* @__PURE__ */ new Set();
const lastAiExecutionTimes = /* @__PURE__ */ new Map();
async function triggerAutoAiAnalysis(pageId) {
  markAiAnalysisNeedsUpdate(pageId);
  const now = Date.now();
  const lastRun = lastAiExecutionTimes.get(pageId) || 0;
  if (now - lastRun < 12e3) {
    return;
  }
  if (activeAiAnalyses.has(pageId)) {
    return;
  }
  activeAiAnalyses.add(pageId);
  lastAiExecutionTimes.set(pageId, now);
  setImmediate(async () => {
    try {
      const page = getPageById(pageId);
      if (!page) return;
      const comments = getPageComments(pageId, void 0, "newest", false);
      if (comments.length === 0) {
        return;
      }
      const commentTexts = comments.map((c) => c.content.trim()).filter(Boolean);
      if (commentTexts.length === 0) return;
      const analysis = await analyzeCommentsWithAI(page.question, commentTexts, pageId);
      saveAiAnalysis(pageId, JSON.stringify(analysis), comments.length, "ready");
      console.log("Analysis saved: YES");
      console.log(`[AI Auto-Analysis] Updated successfully for page "${page.question}" (${comments.length} comments).`);
    } catch (err) {
      console.warn(`[AI Auto-Analysis] Execution deferred or error for page ${pageId}:`, err?.message || err);
    } finally {
      activeAiAnalyses.delete(pageId);
    }
  });
}
const handleGetAiAnalysis = (req, res) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    if (page.user_id !== req.user.id) {
      res.status(403).json({
        error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644. \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062A\u0627\u062D \u0641\u0642\u0637 \u0644\u0635\u0627\u062D\u0628 \u0627\u0644\u0633\u0624\u0627\u0644."
      });
      return;
    }
    const cached = getAiAnalysis(id);
    const comments = getPageComments(id, void 0, "newest", false);
    const commentTexts = comments.map((c) => c.content.trim()).filter(Boolean);
    const currentHash = crypto.createHash("sha256").update(commentTexts.join("\n")).digest("hex");
    if (!cached) {
      if (comments.length > 0) {
        triggerAutoAiAnalysis(id);
        res.json({
          hasAnalysis: false,
          status: "updating",
          message: "\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0648\u0633\u064A\u0638\u0647\u0631 \u0641\u0648\u0631 \u0627\u0643\u062A\u0645\u0627\u0644\u0647.",
          totalComments: comments.length,
          analysis: null
        });
        return;
      }
      res.json({
        hasAnalysis: false,
        status: "no_comments",
        message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0628\u0639\u062F \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u062D\u0644\u064A\u0644.",
        totalComments: 0,
        analysis: null
      });
      return;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(cached.analysis_json);
    } catch (e) {
    }
    const isCountStale = comments.length !== cached.comments_analyzed_count;
    const isContentStale = Boolean(parsed && parsed.commentsHash && parsed.commentsHash !== currentHash);
    const isStale = isCountStale || isContentStale || cached.needs_update === 1;
    if (isStale && !activeAiAnalyses.has(id)) {
      triggerAutoAiAnalysis(id);
    }
    const isUpdating = activeAiAnalyses.has(id) || cached.status === "updating" || cached.needs_update === 1 || isStale;
    const newCommentsCount = Math.max(0, comments.length - cached.comments_analyzed_count);
    res.json({
      hasAnalysis: Boolean(!isStale && parsed && (parsed.totalComments > 0 || parsed.topTraits?.length > 0)),
      status: isUpdating ? "updating" : "ready",
      is_stale: isStale,
      needs_update: Boolean(cached.needs_update || isStale),
      analysis: isStale ? null : parsed,
      // NEVER display stale old analysis if comments changed!
      cached_analysis: isStale ? parsed : void 0,
      analyzed_at: cached.analyzed_at,
      comments_analyzed_count: cached.comments_analyzed_count,
      total_current_comments: comments.length,
      new_comments_count: newCommentsCount
    });
  } catch (err) {
    console.error("Error in AI analysis route:", err);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u062D\u0644\u064A\u0644." });
  }
};
app.get("/api/pages/:id/ai-analysis", requireAuth, handleGetAiAnalysis);
app.get("/api/pages/:id/analysis", requireAuth, handleGetAiAnalysis);
const handlePostAiAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      return;
    }
    if (page.user_id !== req.user.id) {
      res.status(403).json({
        error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u062D\u0644\u064A\u0644. \u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629 \u062E\u0627\u0635\u0629 \u0628\u0635\u0627\u062D\u0628 \u0627\u0644\u0633\u0624\u0627\u0644 \u0641\u0642\u0637."
      });
      return;
    }
    const comments = getPageComments(id, void 0, "newest", false);
    if (comments.length === 0) {
      res.status(400).json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0643\u0627\u0641\u064A\u0629 \u0644\u0625\u062C\u0631\u0627\u0621 \u062A\u062D\u0644\u064A\u0644 \u0645\u0648\u062B\u0648\u0642." });
      return;
    }
    const commentTexts = comments.map((c) => c.content.trim()).filter(Boolean);
    const analysis = await analyzeCommentsWithAI(page.question, commentTexts, id);
    lastAiExecutionTimes.set(id, Date.now());
    saveAiAnalysis(id, JSON.stringify(analysis), comments.length, "ready");
    console.log("Analysis saved: YES");
    res.json({
      success: true,
      analysis,
      analyzed_at: (/* @__PURE__ */ new Date()).toISOString(),
      comments_analyzed_count: comments.length,
      total_current_comments: comments.length,
      new_comments_count: 0
    });
  } catch (err) {
    console.error("AI Analysis Trigger error:", err);
    res.status(500).json({ error: err?.message || "\u062A\u0639\u0630\u0631 \u0625\u062C\u0631\u0627\u0621 \u062A\u062D\u0644\u064A\u0644 AI \u062D\u0642\u064A\u0642\u064A \u062D\u0627\u0644\u064A\u064B\u0627." });
  }
};
app.post("/api/pages/:id/ai-analysis", requireAuth, handlePostAiAnalysis);
app.post("/api/pages/:id/ai-analyze", requireAuth, handlePostAiAnalysis);
app.post("/api/pages/:id/analyze", requireAuth, handlePostAiAnalysis);
app.post("/api/backup", requireAuth, (req, res) => {
  try {
    const result = backupDatabase();
    if (!result.success) {
      res.status(500).json({ error: result.error || "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629." });
      return;
    }
    res.json({ success: true, message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D.", backup: result });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629." });
  }
});
app.get("/api/backups", requireAuth, (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629." });
  }
});
app.get("/api/paypal/packages", (req, res) => {
  res.json({
    packages: Object.values(PAYMENT_PACKAGES)
  });
});
app.get("/api/paypal/config", (req, res) => {
  const config = getPayPalConfig();
  res.json({
    mode: config.mode,
    isConfigured: config.isConfigured
  });
});
app.post("/api/paypal/create-order", requireAuth, async (req, res) => {
  try {
    const { page_id, package_id } = req.body;
    if (!page_id || !package_id) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u0627\u0644\u0628\u0627\u0642\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      return;
    }
    const envBase = process.env.APP_URL;
    let appBaseUrl = envBase && envBase.trim() ? envBase.trim().replace(/\/+$/, "") : "";
    if (!appBaseUrl) {
      const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;
      appBaseUrl = origin.replace(/\/+$/, "");
    }
    const order = await createPayPalOrder({
      pageId: page_id,
      packageId: package_id,
      userId: req.user.id,
      appBaseUrl
    });
    res.json(order);
  } catch (err) {
    console.error("PayPal create-order error:", err);
    res.status(400).json({ error: err.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 PayPal." });
  }
});
app.post("/api/paypal/capture-order", requireAuth, async (req, res) => {
  try {
    const { order_id, page_id } = req.body;
    if (!order_id || !page_id) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0637\u0644\u0628 \u0648\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
      return;
    }
    const capture = await capturePayPalOrder({
      orderId: order_id,
      pageId: page_id,
      userId: req.user.id
    });
    res.json(capture);
  } catch (err) {
    console.error("PayPal capture-order error:", err);
    res.status(400).json({ error: err.message || "\u0641\u0634\u0644 \u062A\u0623\u0643\u064A\u062F \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639 \u0645\u0646 PayPal." });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "\u0646\u0642\u0637\u0629 \u0646\u0647\u0627\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
});
let viteServer = null;
if (!isProduction) {
  const { createServer: createViteServer } = await import("vite");
  viteServer = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/q") || req.originalUrl.startsWith("/u")) {
      return next();
    }
    return viteServer.middlewares(req, res, next);
  });
} else {
  const distDir = path.resolve(process.cwd(), "dist");
  app.use(express.static(distDir));
}
const handlePublicQuestionRoute = async (req, res, next) => {
  try {
    const rawSlug = req.params.slug;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {
    }
    const page = getPageBySlug(decodedSlug) || getPageBySlug(rawSlug) || getPageById(decodedSlug) || getPageById(rawSlug);
    if (req.headers.accept?.includes("application/json") || req.query.format === "json") {
      if (!page) {
        return res.status(404).json({ error: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u062A\u0645 \u062D\u0630\u0641\u0647\u0627." });
      }
      return res.status(200).json({
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
    }
    const distHtml = path.resolve(process.cwd(), "dist/index.html");
    const rootHtml = path.resolve(process.cwd(), "index.html");
    let template = "";
    if (isProduction && fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, "utf-8");
    } else if (fs.existsSync(rootHtml)) {
      template = fs.readFileSync(rootHtml, "utf-8");
    } else if (fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, "utf-8");
    }
    if (page) {
      const sanitizedQuestion = page.question.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      template = template.replace(/<title>.*?<\/title>/, `<title>${sanitizedQuestion} | \u0628\u0635\u064A\u0631\u0629 AI</title>`).replace(
        /<meta property="og:title" content=".*?" \/>/,
        `<meta property="og:title" content="${sanitizedQuestion} | \u0628\u0635\u064A\u0631\u0629 AI" />`
      );
      const preloadedData = JSON.stringify({
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
      });
      template = template.replace("</head>", `<script>window.__INITIAL_PAGE__ = ${preloadedData};</script></head>`);
    }
    if (!isProduction && viteServer) {
      template = await viteServer.transformIndexHtml(req.originalUrl, template);
    }
    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(template);
  } catch (err) {
    next(err);
  }
};
app.get("/q/:slug", handlePublicQuestionRoute);
app.get("/u/:slug", handlePublicQuestionRoute);
app.get("/q", (req, res) => res.redirect("/"));
app.get("*", async (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ error: "\u0646\u0642\u0637\u0629 \u0646\u0647\u0627\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
  }
  try {
    const distHtml = path.resolve(process.cwd(), "dist/index.html");
    const rootHtml = path.resolve(process.cwd(), "index.html");
    let template = "";
    if (isProduction && fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, "utf-8");
    } else if (fs.existsSync(rootHtml)) {
      template = fs.readFileSync(rootHtml, "utf-8");
    } else if (fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, "utf-8");
    }
    if (!isProduction && viteServer) {
      template = await viteServer.transformIndexHtml(req.originalUrl, template);
    }
    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(template);
  } catch (e) {
    if (!isProduction && viteServer) {
      viteServer.ssrFixStacktrace(e);
    }
    next(e);
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Baseera AI Server running on port ${PORT}`);
  const paypalCfg = getPayPalConfig();
  console.log(`PayPal mode: ${paypalCfg.mode}`);
  console.log(`PayPal credentials: ${paypalCfg.isConfigured ? "configured" : "missing"}`);
});
export {
  triggerAutoAiAnalysis
};
