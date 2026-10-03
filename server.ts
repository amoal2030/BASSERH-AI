import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
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
  getAiAnalysis,
} from './server/db.js';
import {
  authMiddleware,
  requireAuth,
  createSessionToken,
  parseGoogleCredential,
  getAnonymousIdentifier,
  AuthenticatedRequest,
} from './server/auth.js';
import { checkHarmfulContent, checkRateLimit } from './server/moderation.js';
import { analyzeCommentsWithAI } from './server/ai.js';

dotenv.config();

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Initialize SQLite database
await initDatabase();
console.log('Database initialized successfully.');

// Auth middleware for all API requests
app.use('/api', authMiddleware);

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

    // Set secure cookie
    res.cookie('baseera_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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

    res.cookie('baseera_session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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

app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
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
      created_at: req.user.created_at,
    },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('baseera_session');
  res.json({ success: true });
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

    // Slug generation or validation
    let slug = '';
    if (custom_slug && typeof custom_slug === 'string' && custom_slug.trim()) {
      slug = custom_slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
      
      const existing = getPageBySlug(slug);
      if (existing) {
        slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
      }
    } else {
      slug = 'q-' + crypto.randomBytes(4).toString('hex');
    }

    const pageId = 'pg_' + crypto.randomBytes(6).toString('hex');
    const page = createPage({
      id: pageId,
      user_id: req.user!.id,
      question: question.trim(),
      slug,
      max_comments: 50, // Strict 50 max comments
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
    const { slug } = req.params;
    const page = getPageBySlug(slug);
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

    res.json({
      comments,
      isOwner,
      total: comments.length,
      max_comments: page.max_comments,
      remaining: Math.max(0, page.max_comments - comments.length),
    });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'فشل جلب التعليقات.' });
  }
});

app.post('/api/pages/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

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

    // Technical identifier for rate limiting & anti-abuse (never shown to page owner)
    const anonymousIdentifier = getAnonymousIdentifier(req);

    // Rate limit check
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
      anonymous_identifier: anonymousIdentifier,
      content: content.trim(),
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

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
    res.status(500).json({ error: 'فشل إرسال التعليق.' });
  }
});

app.delete('/api/comments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
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

// --- AI Analysis Routes ---
app.get('/api/pages/:id/analysis', (req: Request, res: Response) => {
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
      comments_analyzed_count: cached.comments_analyzed_count,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب التحليل.' });
  }
});

app.post('/api/pages/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = getPageById(id);
    if (!page) {
      res.status(404).json({ error: 'الصفحة غير موجودة.' });
      return;
    }

    const comments = getPageComments(id, undefined, 'votes', false);
    if (comments.length === 0) {
      res.status(400).json({ error: 'لا توجد تعليقات بعد لإجراء التحليل.' });
      return;
    }

    const commentTexts = comments.map(c => c.content);
    const analysis = await analyzeCommentsWithAI(page.question, commentTexts);

    saveAiAnalysis(id, JSON.stringify(analysis), comments.length);

    res.json({
      success: true,
      analysis,
      analyzed_at: new Date().toISOString(),
      comments_analyzed_count: comments.length,
    });
  } catch (err: any) {
    console.error('AI Analysis error:', err);
    res.status(500).json({ error: 'فشل إجراء تحليل الذكاء الاصطناعي.' });
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
} else {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Baseera AI Server running on port ${PORT}`);
});
