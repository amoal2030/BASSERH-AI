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
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Initialize SQLite database
await initDatabase();
console.log('Database initialized successfully.');

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
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appUrl: process.env.APP_URL || '',
  });
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

// Firebase Google Login endpoint
app.post('/api/auth/firebase-login', async (req: Request, res: Response) => {
  try {
    const { uid, email, name, photoURL } = req.body;
    if (!uid) {
      res.status(400).json({ error: 'بيانات حساب Google غير مكتملة.' });
      return;
    }

    const userName = name || email?.split('@')[0] || 'User';
    const userEmail = email || `${uid}@firebase.user`;
    const userImage = photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const user = createOrUpdateUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      google_id: uid,
      name: userName,
      email: userEmail,
      profile_image: userImage,
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

app.get('/api/pages/:slug', (req: Request, res: Response) => {
  try {
    const rawSlug = req.params.slug;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (e) {}

    const page = getPageBySlug(decodedSlug) || getPageBySlug(rawSlug);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة أو تم حذفها.' });
      return;
    }

    // Ensure privacy: page owner identity is shown (name + avatar) as they asked the question,
    // but commenters remain strictly anonymous.
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
        owner_image: page.owner_image,
      },
    });
  } catch (err: any) {
    console.error('Error fetching page:', err);
    res.status(500).json({ error: 'حدث خطأ في النظام.' });
  }
});

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
    // Find comment to know which page it belongs to
    const success = deleteComment(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح بحذف هذا التعليق.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف التعليق.' });
  }
});

app.patch('/api/comments/:id/hide', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = toggleHideComment(id, req.user!.id);
    if (!success) {
      res.status(403).json({ error: 'غير مصرح بتعديل هذا التعليق.' });
      return;
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

export async function triggerAutoAiAnalysis(pageId: string): Promise<void> {
  // Mark in database immediately that analysis is updating
  markAiAnalysisNeedsUpdate(pageId);

  if (activeAiAnalyses.has(pageId)) {
    // Analysis is already in-flight for this page; the needs_update flag in DB ensures fresh update
    return;
  }

  activeAiAnalyses.add(pageId);

  // Execute asynchronously in background so comment creation is completely non-blocking
  setImmediate(async () => {
    try {
      const page = getPageById(pageId);
      if (!page) return;

      const comments = getPageComments(pageId, undefined, 'votes', false);
      if (comments.length === 0) {
        return;
      }

      // Strictly extract ONLY the comment text content - never user IDs, names, or emails!
      const commentTexts = comments.map(c => c.content.trim()).filter(Boolean);
      if (commentTexts.length === 0) return;

      const analysis = await analyzeCommentsWithAI(page.question, commentTexts);
      saveAiAnalysis(pageId, JSON.stringify(analysis), comments.length, 'ready');
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
app.get('/api/pages/:id/analysis', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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
    const comments = getPageComments(id, undefined, 'votes', false);

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

    // If comments count changed since last analysis, trigger background refresh
    const isStale = comments.length !== cached.comments_analyzed_count;
    if (isStale && !activeAiAnalyses.has(id)) {
      triggerAutoAiAnalysis(id);
    }

    let parsed = null;
    try {
      parsed = JSON.parse(cached.analysis_json);
    } catch (e) {}

    const isUpdating = activeAiAnalyses.has(id) || cached.status === 'updating' || cached.needs_update === 1;

    res.json({
      hasAnalysis: Boolean(parsed && (parsed.totalComments > 0 || parsed.topTraits?.length > 0)),
      status: isUpdating ? 'updating' : 'ready',
      needs_update: Boolean(cached.needs_update || isStale),
      analysis: parsed,
      analyzed_at: cached.analyzed_at,
      comments_analyzed_count: cached.comments_analyzed_count,
      total_current_comments: comments.length,
    });
  } catch (err: any) {
    console.error('Error in /api/pages/:id/analysis:', err);
    res.status(500).json({ error: 'فشل جلب التحليل.' });
  }
});

// Protected: Only authenticated page owner can trigger a manual re-analysis
app.post('/api/pages/:id/analyze', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    const comments = getPageComments(id, undefined, 'votes', false);
    if (comments.length === 0) {
      res.status(400).json({ error: 'لا توجد تعليقات بعد لإجراء التحليل.' });
      return;
    }

    const commentTexts = comments.map(c => c.content.trim()).filter(Boolean);
    const analysis = await analyzeCommentsWithAI(page.question, commentTexts);

    saveAiAnalysis(id, JSON.stringify(analysis), comments.length, 'ready');

    res.json({
      success: true,
      analysis,
      analyzed_at: new Date().toISOString(),
      comments_analyzed_count: comments.length,
    });
  } catch (err: any) {
    console.error('AI Manual Trigger error:', err);
    res.status(500).json({ error: 'فشل إجراء تحليل الذكاء الاصطناعي.' });
  }
});

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

// Vite middleware in dev or static files in production
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      const templatePath = path.resolve(process.cwd(), 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Baseera AI Server running on port ${PORT}`);
  const paypalCfg = getPayPalConfig();
  console.log(`PayPal mode: ${paypalCfg.mode}`);
  console.log(`PayPal credentials: ${paypalCfg.isConfigured ? 'configured' : 'missing'}`);
});
