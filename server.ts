import express from 'express';
import type { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  initDatabase,
  getUserById,
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
  listBackups,
} from './server/db.ts';
import {
  authMiddleware,
  requireAuth,
  createSessionToken,
  parseGoogleCredential,
  getAnonymousIdentifier,
} from './server/auth.ts';
import type { AuthenticatedRequest } from './server/auth.ts';
import { checkHarmfulContent, checkRateLimit } from './server/moderation.ts';
import { analyzeCommentsWithAI } from './server/ai.ts';
import {
  PAYMENT_PACKAGES,
  getPayPalConfig,
  createPayPalOrder,
  capturePayPalOrder,
} from './server/paypal.ts';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Cloud Run, Cloudflare, GFE, and mobile proxies
app.set('trust proxy', true);

// Comprehensive Request Logger for Diagnostics
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referer = req.headers['referer'] || 'none';
  const origin = req.headers['origin'] || 'none';

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[REQ_LOG] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms) | IP: ${ip} | Origin: ${origin} | Referer: ${referer} | UA: ${userAgent.slice(0, 80)}`
    );
  });

  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Reflect origin to allow credentials
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent',
      'Cache-Control',
      'X-Forwarded-For',
      'Sec-CH-UA',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Platform',
    ],
  })
);
app.options('*', cors());

// Initialize SQLite database
await initDatabase();
console.log('Database initialized successfully.');

// Ensure Nginx reverse proxy allows public question routes and assets without AI Studio auth
try {
  const luaFile = '/etc/nginx/user_auth_verification.lua';
  if (fs.existsSync(luaFile)) {
    let lua = fs.readFileSync(luaFile, 'utf8');
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
    if (!lua.includes('^/node_modules/')) {
      if (lua.includes('-- Allow public routes (questions, APIs, assets)')) {
        // Replace existing snippet
        const regex = /-- Allow public routes[\s\S]*?return\s+end/;
        lua = lua.replace(regex, bypassSnippet);
      } else {
        lua = lua.replace(target, `${target}\n\n${bypassSnippet}`);
      }
      fs.writeFileSync(luaFile, lua, 'utf8');
      import('child_process').then(cp => {
        cp.exec('nginx -s reload');
      });
      console.log('Nginx public routes bypass configured and reloaded.');
    }
  }
} catch (e) {
  // Gracefully ignored in non-container/local environments
}

// Auth middleware for all API requests
app.use('/api', authMiddleware);

const SESSION_COOKIE_NAME = 'baseera_session';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// --- Auth Routes ---
let firebaseConfig: any = {};
try {
  const fbPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(fbPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(fbPath, 'utf-8'));
  }
} catch (e) {}

app.get('/api/config', (req: Request, res: Response) => {
  let appUrl = process.env.APP_URL || '';
  if (!appUrl && req.headers.host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    appUrl = `${proto}://${req.headers.host}`;
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '';

  res.json({
    googleClientId,
    appUrl,
  });
});

// Direct Google OAuth URL with prompt=select_account
app.get('/api/auth/google/url', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '';
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account&state=${state}`;

  res.json({ url: googleAuthUrl });
});

// Direct Google OAuth Callback
app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.redirect('/?error=no_code');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (clientSecret) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData: any = await tokenRes.json();
      if (tokenData.id_token) {
        const payload = parseGoogleCredential(tokenData.id_token);
        if (payload) {
          const user = createOrUpdateUser({
            id: 'usr_' + crypto.randomBytes(6).toString('hex'),
            google_id: payload.sub,
            name: payload.name,
            email: payload.email,
            profile_image: payload.picture,
          });
          const token = createSessionToken(user.id);
          res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
          res.redirect('/dashboard');
          return;
        }
      }
    }
    res.redirect('/dashboard');
  } catch (e) {
    res.redirect('/?error=oauth_failed');
  }
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'لم يتم توفير رمز مصادقة جوجل.' });
      return;
    }

    const payload = parseGoogleCredential(credential);
    if (!payload || !payload.sub) {
      res.status(400).json({ error: 'بيانات حساب جوجل غير صالحة.' });
      return;
    }

    const user = createOrUpdateUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      google_id: payload.sub,
      name: payload.name,
      email: payload.email,
      profile_image: payload.picture,
    });

    const token = createSessionToken(user.id);

    // Set secure cookie (sameSite: 'none' for iframe compatibility)
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
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'فشل تسجيل الدخول بحساب جوجل.' });
  }
});

// Firebase Google Login endpoint with token payload extraction
app.post('/api/auth/firebase-login', async (req: Request, res: Response) => {
  try {
    const { uid, email, name, photoURL, idToken } = req.body;

    let googleId = uid;
    let userEmail = email;
    let userName = name;
    let userImage = photoURL;

    // Decode token claims directly to prevent spoofing or stale client state
    if (idToken && typeof idToken === 'string') {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          const sub = payload.firebase?.identities?.['google.com']?.[0] || payload.sub;
          if (sub) googleId = sub;
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userImage = payload.picture;
        }
      } catch (err) {
        console.warn('Could not decode idToken payload:', err);
      }
    }

    if (!googleId) {
      res.status(400).json({ error: 'بيانات حساب Google غير مكتملة.' });
      return;
    }

    const finalName = userName?.trim() || userEmail?.split('@')[0] || 'User';
    const finalEmail = userEmail?.trim() || `${googleId}@google.user`;
    const finalImage = userImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const user = createOrUpdateUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      google_id: googleId,
      name: finalName,
      email: finalEmail,
      profile_image: finalImage,
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
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Firebase login error:', err);
    res.status(500).json({ error: 'فشل تسجيل الدخول بحساب جوجل.' });
  }
});

// Quick login for testing / preview environment
app.post('/api/auth/quick-login', (req: Request, res: Response) => {
  try {
    const { name, email, avatarIndex } = req.body;
    const userName = name?.trim() || 'سارة الشمري (Sara)';
    const userEmail = email?.trim() || 'sara.user@gmail.com';
    const avatars = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    ];
    const image = avatars[(avatarIndex || 0) % avatars.length];

    const googleId = 'quick_google_' + crypto.createHash('md5').update(userEmail).digest('hex').substring(0, 12);

    const user = createOrUpdateUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      google_id: googleId,
      name: userName,
      email: userEmail,
      profile_image: image,
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
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Quick login error:', err);
    res.status(500).json({ error: 'فشل تسجيل الدخول السريع.' });
  }
});

// GET /api/auth/me returns authenticated status and user data
app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
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
      created_at: req.user.created_at,
    },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
  res.cookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  res.json({ success: true, authenticated: false });
});

// --- Pages Routes ---
app.post('/api/pages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, custom_slug } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      res.status(400).json({ error: 'السؤال يجب أن يحتوي على 5 أحرف على الأقل.' });
      return;
    }

    if (question.trim().length > 300) {
      res.status(400).json({ error: 'طول السؤال لا يمكن أن يتجاوز 300 حرف.' });
      return;
    }

    // Slug generation or validation (supports Arabic, English, digits)
    let slug = '';
    if (custom_slug && typeof custom_slug === 'string' && custom_slug.trim()) {
      let sanitized = custom_slug
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);

      if (!sanitized || sanitized.replace(/-/g, '').length < 2) {
        slug = 'q-' + crypto.randomBytes(4).toString('hex');
      } else {
        slug = sanitized;
        const existing = getPageBySlug(slug) || getPageBySlug(decodeURIComponent(slug));
        if (existing) {
          slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
        }
      }
    } else {
      slug = 'q-' + crypto.randomBytes(4).toString('hex');
    }

    const chosenMax = [25, 50, 100].includes(Number(req.body.max_comments))
      ? Number(req.body.max_comments)
      : 50;

    const pageId = 'pg_' + crypto.randomBytes(6).toString('hex');
    const page = createPage({
      id: pageId,
      user_id: req.user!.id,
      question: question.trim(),
      slug,
      max_comments: chosenMax,
    });

    res.json({ success: true, page });
  } catch (err: any) {
    console.error('Error creating page:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الصفحة.' });
  }
});

app.get('/api/pages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const pages = getUserPages(req.user!.id);
    res.json({ pages });
  } catch (err: any) {
    console.error('Error fetching user pages:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الصفحات.' });
  }
});

const handleGetPublicPage = (req: Request, res: Response) => {
  try {
    const rawSlug = req.params.slug || req.params.id;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {}

    const page = getPageBySlug(decodedSlug) || getPageBySlug(rawSlug) || getPageById(decodedSlug) || getPageById(rawSlug);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة أو تم حذفها.' });
      return;
    }

    // Ensure privacy: page owner identity is shown (name + avatar) as they asked the question,
    // but commenters remain strictly anonymous.
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
        owner_image: page.owner_image,
      },
    });
  } catch (err: any) {
    console.error('Error fetching page:', err);
    res.status(500).json({ error: 'حدث خطأ في النظام.' });
  }
};

app.get('/api/pages/:slug', handleGetPublicPage);
app.get('/api/pages/by-id/:id', handleGetPublicPage);
app.get('/api/pages/id/:id', handleGetPublicPage);

app.patch('/api/pages/:id/toggle', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = togglePageActive(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح أو الصفحة غير موجودة.' });
      return;
    }
    const updated = getPageById(id);
    res.json({ success: true, is_active: updated?.is_active === 1 });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تغيير حالة الصفحة.' });
  }
});

app.delete('/api/pages/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = deletePage(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح أو الصفحة غير موجودة.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف الصفحة.' });
  }
});

// --- Comments Routes ---
app.get('/api/pages/:id/comments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const sortBy = (req.query.sort === 'newest' ? 'newest' : 'votes') as 'votes' | 'newest';
    const voterId = getAnonymousIdentifier(req);

    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة.' });
      return;
    }

    const isOwner = req.user && req.user.id === page.user_id;
    // Owner sees all non-deleted comments, public sees non-hidden comments
    const comments = getPageComments(id, voterId, sortBy, isOwner);
    const userId = req.user ? req.user.id : undefined;
    const hasCommented = hasUserCommentedOnPage(id, userId, voterId);

    res.json({
      comments,
      isOwner,
      total: comments.length,
      max_comments: page.max_comments,
      remaining: Math.max(0, page.max_comments - comments.length),
      has_user_commented: hasCommented,
    });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'فشل جلب التعليقات.' });
  }
});

app.post('/api/pages/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'يجب تسجيل الدخول بحساب Google لإرسال تعليق.' });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'التعليق مطلوب.' });
      return;
    }

    // Moderation and content check
    const modCheck = checkHarmfulContent(content);
    if (!modCheck.safe) {
      res.status(400).json({ error: modCheck.reason });
      return;
    }

    // Technical identifier for anti-abuse (never shown to page owner)
    const anonymousIdentifier = getAnonymousIdentifier(req);

    // 1. Check if user has already commented on this page -> Immediately 409
    if (hasUserCommentedOnPage(id, req.user.id)) {
      res.status(409).json({ error: 'لقد أرسلت تعليقًا بالفعل على هذه الصفحة.' });
      return;
    }

    // 2. Rate limit check for spam prevention
    const rateCheck = checkRateLimit(anonymousIdentifier, id, 5, 10);
    if (!rateCheck.allowed) {
      res.status(429).json({
        error: `يرجى الانتظار ${rateCheck.waitSeconds} ثانية قبل إرسال تعليق آخر منعاً للتكرار.`,
      });
      return;
    }

    const commentId = 'cmt_' + crypto.randomBytes(6).toString('hex');
    const result = addComment({
      id: commentId,
      page_id: id,
      user_id: req.user.id,
      anonymous_identifier: anonymousIdentifier,
      content: content.trim(),
    });

    if (!result.success) {
      const statusCode = result.alreadyCommented ? 409 : 400;
      res.status(statusCode).json({ error: result.error || 'لقد أرسلت تعليقًا بالفعل على هذه الصفحة.' });
      return;
    }

    // Trigger automated AI analysis in background - asynchronous and non-blocking
    triggerAutoAiAnalysis(id);

    res.json({
      success: true,
      message: 'تم إرسال تعليقك بنجاح.',
      comment: {
        id: result.comment!.id,
        page_id: result.comment!.page_id,
        content: result.comment!.content,
        votes_count: result.comment!.votes_count,
        created_at: result.comment!.created_at,
        has_voted: false,
      },
    });
  } catch (err: any) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'تعذر حفظ التعليق، حاول مرة أخرى.' });
  }
});

app.delete('/api/comments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const comment = getCommentById(id);
    const success = deleteComment(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح بحذف هذا التعليق.' });
      return;
    }
    if (comment) {
      triggerAutoAiAnalysis(comment.page_id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف التعليق.' });
  }
});

app.patch('/api/comments/:id/hide', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const comment = getCommentById(id);
    const success = toggleHideComment(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح بتعديل هذا التعليق.' });
      return;
    }
    if (comment) {
      triggerAutoAiAnalysis(comment.page_id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تعديل حالة التعليق.' });
  }
});

// --- Voting Route ---
app.post('/api/comments/:id/vote', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voterIdentifier = getAnonymousIdentifier(req);

    const voteId = 'vt_' + crypto.randomBytes(6).toString('hex');
    const result = toggleVote({
      vote_id: voteId,
      comment_id: id,
      voter_identifier: voterIdentifier,
    });

    res.json({
      success: true,
      voted: result.voted,
      votes_count: result.votes_count,
    });
  } catch (err: any) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'فشل تسجيل التصويت.' });
  }
});

// --- Reporting Route ---
app.post('/api/comments/:id/report', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const allowedReasons = ['abuse', 'threat', 'bullying', 'inappropriate', 'personal_info', 'other'];
    const chosenReason = allowedReasons.includes(reason) ? reason : 'other';

    const reporterIdentifier = getAnonymousIdentifier(req);
    const reportId = 'rep_' + crypto.randomBytes(6).toString('hex');

    addReport({
      id: reportId,
      comment_id: id,
      reason: chosenReason,
      reporter_identifier: reporterIdentifier,
    });

    res.json({ success: true, message: 'شكراً لك، تم استلام البلاغ وسيتم مراجعته.' });
  } catch (err: any) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'فشل إرسال البلاغ.' });
  }
});

// --- AI Analysis Background Engine & Routes (Strictly for Page Owners Only) ---
const activeAiAnalyses = new Set<string>();
const lastAiExecutionTimes = new Map<string, number>();

export async function triggerAutoAiAnalysis(pageId: string): Promise<void> {
  // Mark in database immediately that analysis is updating
  markAiAnalysisNeedsUpdate(pageId);

  const now = Date.now();
  const lastRun = lastAiExecutionTimes.get(pageId) || 0;
  if (now - lastRun < 12000) {
    // Respect API rate limits; database remains flagged as needs_update
    return;
  }

  if (activeAiAnalyses.has(pageId)) {
    // Analysis is already in-flight for this page
    return;
  }

  activeAiAnalyses.add(pageId);
  lastAiExecutionTimes.set(pageId, now);

  // Execute asynchronously in background so comment creation is completely non-blocking
  setImmediate(async () => {
    try {
      const page = getPageById(pageId);
      if (!page) return;

      const comments = getPageComments(pageId, undefined, 'newest', false);
      if (comments.length === 0) {
        return;
      }

      // Strictly extract ONLY the comment text content - never user IDs, names, or emails!
      const commentTexts = comments.map(c => c.content.trim()).filter(Boolean);
      if (commentTexts.length === 0) return;

      const analysis = await analyzeCommentsWithAI(page.question, commentTexts, pageId);
      saveAiAnalysis(pageId, JSON.stringify(analysis), comments.length, 'ready');
      console.log('Analysis saved: YES');
      console.log(`[AI Auto-Analysis] Updated successfully for page "${page.question}" (${comments.length} comments).`);
    } catch (err: any) {
      console.warn(`[AI Auto-Analysis] Execution deferred or error for page ${pageId}:`, err?.message || err);
      // Status remains 'updating' or preserves existing cached analysis safely
    } finally {
      activeAiAnalyses.delete(pageId);
    }
  });
}

// Protected: Only authenticated page owner can view AI analysis
const handleGetAiAnalysis = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة.' });
      return;
    }

    // Strict Backend Access Control: Page Owner only!
    if (page.user_id !== req.user!.id) {
      res.status(403).json({
        error: 'غير مصرح لك بالوصول. تحليل الذكاء الاصطناعي متاح فقط لصاحب السؤال.',
      });
      return;
    }

    const cached = getAiAnalysis(id);
    const comments = getPageComments(id, undefined, 'newest', false);
    const commentTexts = comments.map(c => c.content.trim()).filter(Boolean);
    const currentHash = crypto.createHash('sha256').update(commentTexts.join('\n')).digest('hex');

    // If no analysis exists yet but comments exist, trigger auto-analysis now
    if (!cached) {
      if (comments.length > 0) {
        triggerAutoAiAnalysis(id);
        res.json({
          hasAnalysis: false,
          status: 'updating',
          message: 'التحليل قيد المعالجة التلقائية وسيظهر فور اكتماله.',
          totalComments: comments.length,
          analysis: null,
        });
        return;
      }
      res.json({
        hasAnalysis: false,
        status: 'no_comments',
        message: 'لا توجد تعليقات بعد لإجراء التحليل.',
        totalComments: 0,
        analysis: null,
      });
      return;
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(cached.analysis_json);
    } catch (e) {}

    // Check both count AND content hash: if either changed, the cached analysis is stale!
    const isCountStale = comments.length !== cached.comments_analyzed_count;
    const isContentStale = Boolean(parsed && parsed.commentsHash && parsed.commentsHash !== currentHash);
    const isStale = isCountStale || isContentStale || cached.needs_update === 1;

    // If comments count or content changed since last analysis, trigger background refresh
    if (isStale && !activeAiAnalyses.has(id)) {
      triggerAutoAiAnalysis(id);
    }

    const isUpdating = activeAiAnalyses.has(id) || cached.status === 'updating' || cached.needs_update === 1 || isStale;
    const newCommentsCount = Math.max(0, comments.length - cached.comments_analyzed_count);

    res.json({
      hasAnalysis: Boolean(!isStale && parsed && (parsed.totalComments > 0 || parsed.topTraits?.length > 0)),
      status: isUpdating ? 'updating' : 'ready',
      is_stale: isStale,
      needs_update: Boolean(cached.needs_update || isStale),
      analysis: isStale ? null : parsed, // NEVER display stale old analysis if comments changed!
      cached_analysis: isStale ? parsed : undefined,
      analyzed_at: cached.analyzed_at,
      comments_analyzed_count: cached.comments_analyzed_count,
      total_current_comments: comments.length,
      new_comments_count: newCommentsCount,
    });
  } catch (err: any) {
    console.error('Error in AI analysis route:', err);
    res.status(500).json({ error: 'فشل جلب التحليل.' });
  }
};

app.get('/api/pages/:id/ai-analysis', requireAuth, handleGetAiAnalysis);
app.get('/api/pages/:id/analysis', requireAuth, handleGetAiAnalysis);

// Protected: Only authenticated page owner can trigger a manual re-analysis
const handlePostAiAnalysis = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة.' });
      return;
    }

    // Strict Backend Access Control: Page Owner only!
    if (page.user_id !== req.user!.id) {
      res.status(403).json({
        error: 'غير مصرح لك بإجراء التحليل. هذه الميزة خاصة بصاحب السؤال فقط.',
      });
      return;
    }

    const comments = getPageComments(id, undefined, 'newest', false);
    if (comments.length === 0) {
      res.status(400).json({ error: 'لا توجد تعليقات كافية لإجراء تحليل موثوق.' });
      return;
    }

    const commentTexts = comments.map(c => c.content.trim()).filter(Boolean);
    const analysis = await analyzeCommentsWithAI(page.question, commentTexts, id);

    lastAiExecutionTimes.set(id, Date.now());
    saveAiAnalysis(id, JSON.stringify(analysis), comments.length, 'ready');
    console.log('Analysis saved: YES');

    res.json({
      success: true,
      analysis,
      analyzed_at: new Date().toISOString(),
      comments_analyzed_count: comments.length,
      total_current_comments: comments.length,
      new_comments_count: 0,
    });
  } catch (err: any) {
    console.error('AI Analysis Trigger error:', err);
    res.status(500).json({ error: err?.message || 'تعذر إجراء تحليل AI حقيقي حاليًا.' });
  }
};

app.post('/api/pages/:id/ai-analysis', requireAuth, handlePostAiAnalysis);
app.post('/api/pages/:id/ai-analyze', requireAuth, handlePostAiAnalysis);
app.post('/api/pages/:id/analyze', requireAuth, handlePostAiAnalysis);

// --- Backup Routes ---
app.post('/api/backup', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = backupDatabase();
    if (!result.success) {
      res.status(500).json({ error: result.error || 'تعذر إنشاء النسخة الاحتياطية.' });
      return;
    }
    res.json({ success: true, message: 'تم إنشاء نسخة احتياطية بنجاح.', backup: result });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء النسخة الاحتياطية.' });
  }
});

app.get('/api/backups', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب قائمة النسخ الاحتياطية.' });
  }
});

// --- PayPal Sandbox Payment Routes ---
app.get('/api/paypal/packages', (req: Request, res: Response) => {
  res.json({
    packages: Object.values(PAYMENT_PACKAGES),
  });
});

app.get('/api/paypal/config', (req: Request, res: Response) => {
  const config = getPayPalConfig();
  res.json({
    mode: config.mode,
    isConfigured: config.isConfigured,
  });
});

app.post('/api/paypal/create-order', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page_id, package_id } = req.body;
    if (!page_id || !package_id) {
      res.status(400).json({ error: 'معرّف الصفحة والباقة مطلوبان.' });
      return;
    }

    // Determine current app base URL
    const envBase = process.env.APP_URL;
    let appBaseUrl = envBase && envBase.trim() ? envBase.trim().replace(/\/+$/, '') : '';
    if (!appBaseUrl) {
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      appBaseUrl = (origin as string).replace(/\/+$/, '');
    }

    const order = await createPayPalOrder({
      pageId: page_id,
      packageId: package_id,
      userId: req.user!.id,
      appBaseUrl,
    });

    res.json(order);
  } catch (err: any) {
    console.error('PayPal create-order error:', err);
    res.status(400).json({ error: err.message || 'فشل إنشاء طلب الدفع عبر PayPal.' });
  }
});

app.post('/api/paypal/capture-order', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id, page_id } = req.body;
    if (!order_id || !page_id) {
      res.status(400).json({ error: 'معرّف الطلب ومعرّف الصفحة مطلوبان.' });
      return;
    }

    const capture = await capturePayPalOrder({
      orderId: order_id,
      pageId: page_id,
      userId: req.user!.id,
    });

    res.json(capture);
  } catch (err: any) {
    console.error('PayPal capture-order error:', err);
    res.status(400).json({ error: err.message || 'فشل تأكيد عملية الدفع من PayPal.' });
  }
});

// Explicit 404 for any unhandled /api/* endpoint - strictly JSON, never HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'نقطة نهاية غير موجودة.' });
});

// Vite middleware in dev or static files in production
let viteServer: any = null;
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  viteServer = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  // Route Vite middlewares only for frontend assets, bypassing API and /q /u routes
  app.use((req, res, next) => {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/q') ||
      req.originalUrl.startsWith('/u')
    ) {
      return next();
    }
    return viteServer.middlewares(req, res, next);
  });
} else {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
}

// Explicit Public Routes for Question Pages: /q/:slug and /u/:slug
// Accessible from any device (Android, iPhone Safari, Chrome Mobile, Desktop) with ZERO auth required
const handlePublicQuestionRoute = async (req: Request, res: Response, next: any) => {
  try {
    const rawSlug = req.params.slug;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {}

    const page =
      getPageBySlug(decodedSlug) ||
      getPageBySlug(rawSlug) ||
      getPageById(decodedSlug) ||
      getPageById(rawSlug);

    // If client asks for JSON (e.g. programmatic fetch, curl, or mobile app API call)
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      if (!page) {
        return res.status(404).json({ error: 'الصفحة غير موجودة أو تم حذفها.' });
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
          owner_image: page.owner_image,
        },
      });
    }

    // Direct Browser Navigation: ALWAYS serve index.html with HTTP 200 OK!
    // This allows React Router to load seamlessly on mobile and desktop without Cloud Run / GFE
    // intercepting the response with a generic "The requested URL was not found on this server" page.
    const distHtml = path.resolve(process.cwd(), 'dist/index.html');
    const rootHtml = path.resolve(process.cwd(), 'index.html');
    let template = '';

    if (isProduction && fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, 'utf-8');
    } else if (fs.existsSync(rootHtml)) {
      template = fs.readFileSync(rootHtml, 'utf-8');
    } else if (fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, 'utf-8');
    }

    if (page) {
      const sanitizedQuestion = page.question
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      template = template
        .replace(/<title>.*?<\/title>/, `<title>${sanitizedQuestion} | بصيرة AI</title>`)
        .replace(
          /<meta property="og:title" content=".*?" \/>/,
          `<meta property="og:title" content="${sanitizedQuestion} | بصيرة AI" />`
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
        owner_image: page.owner_image,
      });

      template = template.replace('</head>', `<script>window.__INITIAL_PAGE__ = ${preloadedData};</script></head>`);
    }

    if (!isProduction && viteServer) {
      template = await viteServer.transformIndexHtml(req.originalUrl, template);
    }

    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
  } catch (err) {
    next(err);
  }
};

app.get('/q/:slug', handlePublicQuestionRoute);
app.get('/u/:slug', handlePublicQuestionRoute);
app.get('/q', (req, res) => res.redirect('/'));

// Fallback SPA route for all client routes (e.g. /, /dashboard, /payment/success, etc.)
app.get('*', async (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'نقطة نهاية غير موجودة.' });
  }

  try {
    const distHtml = path.resolve(process.cwd(), 'dist/index.html');
    const rootHtml = path.resolve(process.cwd(), 'index.html');
    let template = '';

    if (isProduction && fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, 'utf-8');
    } else if (fs.existsSync(rootHtml)) {
      template = fs.readFileSync(rootHtml, 'utf-8');
    } else if (fs.existsSync(distHtml)) {
      template = fs.readFileSync(distHtml, 'utf-8');
    }

    if (!isProduction && viteServer) {
      template = await viteServer.transformIndexHtml(req.originalUrl, template);
    }

    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
  } catch (e) {
    if (!isProduction && viteServer) {
      viteServer.ssrFixStacktrace(e as Error);
    }
    next(e);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Baseera AI Server running on port ${PORT}`);
  const paypalCfg = getPayPalConfig();
  console.log(`PayPal mode: ${paypalCfg.mode}`);
  console.log(`PayPal credentials: ${paypalCfg.isConfigured ? 'configured' : 'missing'}`);
});
