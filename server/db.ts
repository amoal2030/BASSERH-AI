import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let db: Database;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app.sqlite');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export interface User {
  id: string;
  google_id: string;
  name: string;
  email: string;
  profile_image: string;
  created_at: string;
}

export interface Page {
  id: string;
  user_id: string;
  question: string;
  slug: string;
  max_comments: number;
  comments_count: number;
  is_active: number;
  created_at: string;
  updated_at?: string;
  owner_name?: string;
  owner_image?: string;
}

export interface Comment {
  id: string;
  page_id: string;
  user_id?: string;
  anonymous_identifier: string; // Internal hash only, never sent to page owner
  content: string;
  votes_count: number;
  is_hidden: number;
  created_at: string;
  has_voted?: boolean;
}

export interface Vote {
  id: string;
  comment_id: string;
  voter_identifier: string;
  created_at: string;
}

export interface Report {
  id: string;
  comment_id: string;
  reason: string;
  reporter_identifier: string;
  created_at: string;
}

export interface AiAnalysisData {
  id: string;
  page_id: string;
  summary?: string;
  traits?: string;
  percentages?: string;
  analysis_json: string;
  analyzed_at: string;
  comments_analyzed_count: number;
  status?: string;
  needs_update?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  page_id: string;
  package: string;
  amount: number;
  currency: string;
  paypal_order_id: string;
  paypal_capture_id?: string;
  status: string; // 'CREATED', 'COMPLETED', 'FAILED', 'CANCELLED'
  created_at: string;
  updated_at: string;
}

// Persist the SQLite database atomically to disk
export function persistDatabase() {
  if (!db) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

// Create a timestamped backup of the database
export function backupDatabase(): { success: boolean; filename?: string; path?: string; error?: string } {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    persistDatabase();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sqlite`;
    const destPath = path.join(BACKUP_DIR, filename);

    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, destPath);
      return { success: true, filename, path: destPath };
    } else {
      return { success: false, error: 'Database file not found.' };
    }
  } catch (err: any) {
    console.error('Failed to create backup:', err);
    return { success: false, error: err.message };
  }
}

// List all existing backups
export function listBackups(): { filename: string; size: number; date: string }[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sqlite'))
      .sort()
      .reverse()
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          date: stats.mtime.toISOString(),
        };
      });
  } catch (err) {
    console.error('Error listing backups:', err);
    return [];
  }
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Failed to load existing SQLite database file, creating fresh one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables according to user requirements
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      profile_image TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      max_comments INTEGER DEFAULT 50,
      comments_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      user_id TEXT,
      anonymous_identifier TEXT NOT NULL,
      content TEXT NOT NULL,
      votes_count INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS page_participations (
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_id, user_id),
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      voter_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(comment_id, voter_identifier),
      FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      reporter_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      page_id TEXT UNIQUE NOT NULL,
      summary TEXT,
      traits TEXT,
      percentages TEXT,
      analysis_json TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      comments_analyzed_count INTEGER NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      package TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      paypal_order_id TEXT UNIQUE NOT NULL,
      paypal_capture_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `);

  // Safe schema migrations for existing databases
  try {
    db.run('ALTER TABLE pages ADD COLUMN updated_at TEXT;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN summary TEXT;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN traits TEXT;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN percentages TEXT;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN created_at TEXT;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN updated_at TEXT;');
  } catch (e) {}
  try {
    db.run("ALTER TABLE ai_analyses ADD COLUMN status TEXT DEFAULT 'ready';");
  } catch (e) {}
  try {
    db.run('ALTER TABLE ai_analyses ADD COLUMN needs_update INTEGER DEFAULT 0;');
  } catch (e) {}
  try {
    db.run('ALTER TABLE comments ADD COLUMN user_id TEXT;');
  } catch (e) {}
  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_page_user ON comments(page_id, user_id) WHERE user_id IS NOT NULL;');
  } catch (e) {}
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS page_participations (
        page_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (page_id, user_id),
        FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        package TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        paypal_order_id TEXT UNIQUE NOT NULL,
        paypal_capture_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}

  persistDatabase();
  seedInitialDataIfEmpty();
  return db;
}

// User functions
export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = :id');
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as User;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getUserByGoogleId(googleId: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE google_id = :googleId');
  stmt.bind({ ':googleId': googleId });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as User;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getUserByEmail(email: string): User | null {
  if (!email) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE email = :email');
  stmt.bind({ ':email': email.trim().toLowerCase() });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as User;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function createOrUpdateUser(user: {
  id: string;
  google_id: string;
  name: string;
  email: string;
  profile_image: string;
}): User {
  const existing = getUserByGoogleId(user.google_id);
  const now = new Date().toISOString();
  const normalizedEmail = user.email.trim().toLowerCase();

  if (existing) {
    db.run(
      'UPDATE users SET name = :name, email = :email, profile_image = :image WHERE id = :id',
      {
        ':id': existing.id,
        ':name': user.name,
        ':email': normalizedEmail,
        ':image': user.profile_image,
      }
    );
    persistDatabase();
    return { ...existing, name: user.name, email: normalizedEmail, profile_image: user.profile_image };
  } else {
    // If user previously registered with same email, link their google_id
    const existingByEmail = getUserByEmail(normalizedEmail);
    if (existingByEmail) {
      db.run(
        'UPDATE users SET google_id = :google_id, name = :name, profile_image = :image WHERE id = :id',
        {
          ':id': existingByEmail.id,
          ':google_id': user.google_id,
          ':name': user.name,
          ':image': user.profile_image,
        }
      );
      persistDatabase();
      return {
        ...existingByEmail,
        google_id: user.google_id,
        name: user.name,
        profile_image: user.profile_image,
      };
    }

    db.run(
      'INSERT INTO users (id, google_id, name, email, profile_image, created_at) VALUES (:id, :google_id, :name, :email, :image, :created_at)',
      {
        ':id': user.id,
        ':google_id': user.google_id,
        ':name': user.name,
        ':email': normalizedEmail,
        ':image': user.profile_image,
        ':created_at': now,
      }
    );
    persistDatabase();
    return {
      id: user.id,
      google_id: user.google_id,
      name: user.name,
      email: normalizedEmail,
      profile_image: user.profile_image,
      created_at: now,
    };
  }
}

// Pages functions
export function createPage(params: {
  id: string;
  user_id: string;
  question: string;
  slug: string;
  max_comments?: number;
}): Page {
  const now = new Date().toISOString();
  const maxComments = params.max_comments || 50;

  db.run(
    'INSERT INTO pages (id, user_id, question, slug, max_comments, comments_count, is_active, created_at, updated_at) VALUES (:id, :user_id, :question, :slug, :max, 0, 1, :created_at, :updated_at)',
    {
      ':id': params.id,
      ':user_id': params.user_id,
      ':question': params.question,
      ':slug': params.slug,
      ':max': maxComments,
      ':created_at': now,
      ':updated_at': now,
    }
  );
  persistDatabase();

  return {
    id: params.id,
    user_id: params.user_id,
    question: params.question,
    slug: params.slug,
    max_comments: maxComments,
    comments_count: 0,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

export function getPageBySlug(slug: string): Page | null {
  const stmt = db.prepare(`
    SELECT p.*, u.name as owner_name, u.profile_image as owner_image 
    FROM pages p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.slug = :slug
  `);
  stmt.bind({ ':slug': slug });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Page;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getPageById(id: string): Page | null {
  const stmt = db.prepare(`
    SELECT p.*, u.name as owner_name, u.profile_image as owner_image 
    FROM pages p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.id = :id
  `);
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Page;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getUserPages(userId: string): (Page & { total_votes: number })[] {
  const stmt = db.prepare(`
    SELECT p.*, 
      COALESCE((SELECT SUM(c.votes_count) FROM comments c WHERE c.page_id = p.id AND c.is_hidden = 0), 0) as total_votes
    FROM pages p 
    WHERE p.user_id = :userId 
    ORDER BY p.created_at DESC
  `);
  stmt.bind({ ':userId': userId });
  const results: (Page & { total_votes: number })[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as (Page & { total_votes: number }));
  }
  stmt.free();
  return results;
}

export function togglePageActive(pageId: string, userId: string): boolean {
  const page = getPageById(pageId);
  if (!page || page.user_id !== userId) return false;

  const now = new Date().toISOString();
  const newStatus = page.is_active === 1 ? 0 : 1;
  db.run('UPDATE pages SET is_active = :status, updated_at = :now WHERE id = :id', {
    ':status': newStatus,
    ':now': now,
    ':id': pageId,
  });
  persistDatabase();
  return true;
}

export function deletePage(pageId: string, userId: string): boolean {
  const page = getPageById(pageId);
  if (!page || page.user_id !== userId) return false;

  db.run('DELETE FROM reports WHERE comment_id IN (SELECT id FROM comments WHERE page_id = :id)', { ':id': pageId });
  db.run('DELETE FROM votes WHERE comment_id IN (SELECT id FROM comments WHERE page_id = :id)', { ':id': pageId });
  db.run('DELETE FROM comments WHERE page_id = :id', { ':id': pageId });
  db.run('DELETE FROM page_participations WHERE page_id = :id', { ':id': pageId });
  db.run('DELETE FROM ai_analyses WHERE page_id = :id', { ':id': pageId });
  db.run('DELETE FROM pages WHERE id = :id', { ':id': pageId });
  persistDatabase();
  return true;
}

// Check if user (by user_id or anonymous identifier) has already commented on this page
export function hasUserCommentedOnPage(pageId: string, userId?: string, anonymousIdentifier?: string): boolean {
  if (userId) {
    // 1. Check permanent page_participations (survives comment deletion)
    const partStmt = db.prepare('SELECT 1 FROM page_participations WHERE page_id = :page_id AND user_id = :user_id LIMIT 1');
    partStmt.bind({ ':page_id': pageId, ':user_id': userId });
    const hasPart = partStmt.step();
    partStmt.free();
    if (hasPart) return true;

    // 2. Check comments table directly by user_id
    const commStmt = db.prepare('SELECT 1 FROM comments WHERE page_id = :page_id AND user_id = :user_id LIMIT 1');
    commStmt.bind({ ':page_id': pageId, ':user_id': userId });
    const hasComm = commStmt.step();
    commStmt.free();
    return hasComm;
  }

  // Only check anonymousIdentifier if no logged-in user_id is provided
  if (anonymousIdentifier) {
    const stmt = db.prepare('SELECT 1 FROM comments WHERE page_id = :page_id AND anonymous_identifier = :anon LIMIT 1');
    stmt.bind({ ':page_id': pageId, ':anon': anonymousIdentifier });
    const has = stmt.step();
    stmt.free();
    return has;
  }

  return false;
}

// Comments functions
export function addComment(params: {
  id: string;
  page_id: string;
  user_id?: string;
  anonymous_identifier: string;
  content: string;
}): { success: boolean; comment?: Comment; error?: string; alreadyCommented?: boolean } {
  const page = getPageById(params.page_id);
  if (!page) {
    return { success: false, error: 'الصفحة غير موجودة' };
  }

  if (page.is_active === 0) {
    return { success: false, error: 'تم إيقاف استقبال التعليقات على هذه الصفحة مؤقتاً من قبل صاحبها.' };
  }

  // Enforce single comment per user per page: Backend logic check
  if (hasUserCommentedOnPage(params.page_id, params.user_id, params.anonymous_identifier)) {
    return {
      success: false,
      alreadyCommented: true,
      error: 'لقد أرسلت تعليقًا بالفعل على هذه الصفحة.',
    };
  }

  // Count current visible comments
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM comments WHERE page_id = :page_id');
  countStmt.bind({ ':page_id': params.page_id });
  let currentCount = 0;
  if (countStmt.step()) {
    currentCount = (countStmt.getAsObject() as { count: number }).count;
  }
  countStmt.free();

  if (currentCount >= page.max_comments) {
    return { success: false, error: `اكتملت الصفحة، لقد تم الوصول إلى الحد الأقصى (${page.max_comments} تعليقًا).` };
  }

  const now = new Date().toISOString();

  try {
    // Record permanent participation if user_id is provided
    if (params.user_id) {
      db.run(
        'INSERT OR IGNORE INTO page_participations (page_id, user_id, created_at) VALUES (:page_id, :user_id, :now)',
        {
          ':page_id': params.page_id,
          ':user_id': params.user_id,
          ':now': now,
        }
      );
    }

    db.run(
      'INSERT INTO comments (id, page_id, user_id, anonymous_identifier, content, votes_count, is_hidden, created_at) VALUES (:id, :page_id, :user_id, :anon, :content, 0, 0, :created_at)',
      {
        ':id': params.id,
        ':page_id': params.page_id,
        ':user_id': params.user_id || null,
        ':anon': params.anonymous_identifier,
        ':content': params.content,
        ':created_at': now,
      }
    );
  } catch (err: any) {
    // Catch database-level UNIQUE(page_id, user_id) constraint
    if (err && (err.message?.includes('UNIQUE') || err.message?.includes('constraint'))) {
      return {
        success: false,
        alreadyCommented: true,
        error: 'لقد أرسلت تعليقًا بالفعل على هذه الصفحة.',
      };
    }
    throw err;
  }

  // Update page comments_count and updated_at
  db.run('UPDATE pages SET comments_count = comments_count + 1, updated_at = :now WHERE id = :page_id', {
    ':page_id': params.page_id,
    ':now': now,
  });

  persistDatabase();

  return {
    success: true,
    comment: {
      id: params.id,
      page_id: params.page_id,
      user_id: params.user_id,
      anonymous_identifier: params.anonymous_identifier,
      content: params.content,
      votes_count: 0,
      is_hidden: 0,
      created_at: now,
    },
  };
}

export function getPageComments(
  pageId: string,
  voterIdentifier?: string,
  sortBy: 'votes' | 'newest' = 'votes',
  includeHidden: boolean = false
): Comment[] {
  let query = `
    SELECT id, page_id, content, votes_count, is_hidden, created_at 
    FROM comments 
    WHERE page_id = :page_id
  `;

  if (!includeHidden) {
    query += ' AND is_hidden = 0';
  }

  if (sortBy === 'votes') {
    query += ' ORDER BY votes_count DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const stmt = db.prepare(query);
  stmt.bind({ ':page_id': pageId });
  const comments: Comment[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Comment;
    // Check if voterIdentifier has voted
    if (voterIdentifier) {
      const vStmt = db.prepare('SELECT 1 FROM votes WHERE comment_id = :cid AND voter_identifier = :vid');
      vStmt.bind({ ':cid': row.id, ':vid': voterIdentifier });
      row.has_voted = vStmt.step();
      vStmt.free();
    } else {
      row.has_voted = false;
    }
    comments.push(row);
  }
  stmt.free();

  return comments;
}

export function getCommentById(id: string): Comment | null {
  const stmt = db.prepare('SELECT * FROM comments WHERE id = :id');
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Comment;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function deleteComment(commentId: string, userId: string): boolean {
  const comment = getCommentById(commentId);
  if (!comment) return false;

  const page = getPageById(comment.page_id);
  if (!page || page.user_id !== userId) return false;

  const now = new Date().toISOString();
  db.run('DELETE FROM reports WHERE comment_id = :id', { ':id': commentId });
  db.run('DELETE FROM votes WHERE comment_id = :id', { ':id': commentId });
  db.run('DELETE FROM comments WHERE id = :id', { ':id': commentId });
  db.run('UPDATE pages SET comments_count = MAX(0, comments_count - 1), updated_at = :now WHERE id = :page_id', {
    ':page_id': comment.page_id,
    ':now': now,
  });

  markAiAnalysisNeedsUpdate(comment.page_id);
  persistDatabase();
  return true;
}

export function toggleHideComment(commentId: string, userId: string): boolean {
  const comment = getCommentById(commentId);
  if (!comment) return false;

  const page = getPageById(comment.page_id);
  if (!page || page.user_id !== userId) return false;

  const newStatus = comment.is_hidden === 1 ? 0 : 1;
  db.run('UPDATE comments SET is_hidden = :status WHERE id = :id', {
    ':status': newStatus,
    ':id': commentId,
  });

  markAiAnalysisNeedsUpdate(comment.page_id);
  persistDatabase();
  return true;
}

// Voting functions
export function toggleVote(params: {
  vote_id: string;
  comment_id: string;
  voter_identifier: string;
}): { voted: boolean; votes_count: number } {
  const checkStmt = db.prepare('SELECT id FROM votes WHERE comment_id = :cid AND voter_identifier = :vid');
  checkStmt.bind({ ':cid': params.comment_id, ':vid': params.voter_identifier });

  const alreadyVoted = checkStmt.step();
  checkStmt.free();

  if (alreadyVoted) {
    // Remove vote
    db.run('DELETE FROM votes WHERE comment_id = :cid AND voter_identifier = :vid', {
      ':cid': params.comment_id,
      ':vid': params.voter_identifier,
    });
    db.run('UPDATE comments SET votes_count = MAX(0, votes_count - 1) WHERE id = :cid', {
      ':cid': params.comment_id,
    });
  } else {
    // Add vote
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO votes (id, comment_id, voter_identifier, created_at) VALUES (:id, :cid, :vid, :created_at)',
      {
        ':id': params.vote_id,
        ':cid': params.comment_id,
        ':vid': params.voter_identifier,
        ':created_at': now,
      }
    );
    db.run('UPDATE comments SET votes_count = votes_count + 1 WHERE id = :cid', {
      ':cid': params.comment_id,
    });
  }

  persistDatabase();

  const c = getCommentById(params.comment_id);
  return {
    voted: !alreadyVoted,
    votes_count: c ? c.votes_count : 0,
  };
}

// Reporting functions
export function addReport(params: {
  id: string;
  comment_id: string;
  reason: string;
  reporter_identifier: string;
}): boolean {
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO reports (id, comment_id, reason, reporter_identifier, created_at) VALUES (:id, :cid, :reason, :rid, :created_at)',
    {
      ':id': params.id,
      ':cid': params.comment_id,
      ':reason': params.reason,
      ':rid': params.reporter_identifier,
      ':created_at': now,
    }
  );

  // If reports reach 3 or more, auto-hide the comment
  const rStmt = db.prepare('SELECT COUNT(*) as c FROM reports WHERE comment_id = :cid');
  rStmt.bind({ ':cid': params.comment_id });
  let reportCount = 0;
  if (rStmt.step()) {
    reportCount = (rStmt.getAsObject() as { c: number }).c;
  }
  rStmt.free();

  if (reportCount >= 3) {
    db.run('UPDATE comments SET is_hidden = 1 WHERE id = :cid', { ':cid': params.comment_id });
  }

  persistDatabase();
  return true;
}

// AI Analysis functions
export function deleteAiAnalysis(pageId: string): void {
  db.run('DELETE FROM ai_analyses WHERE page_id = :id', { ':id': pageId });
  persistDatabase();
}

export function saveAiAnalysis(
  pageId: string,
  analysisJson: string,
  commentsCount: number,
  status: string = 'ready'
): void {
  const now = new Date().toISOString();
  const id = 'ai_' + crypto.randomBytes(6).toString('hex');

  let summary = '';
  let traits = '';
  let percentages = '';

  try {
    const parsed = typeof analysisJson === 'string' ? JSON.parse(analysisJson) : analysisJson;
    summary = parsed.summary || '';
    traits = JSON.stringify(parsed.topTraits || []);
    percentages = JSON.stringify(
      (parsed.topTraits || []).map((t: any) => ({
        trait: t.trait,
        percentage: t.percentage,
        category: t.category,
      }))
    );
  } catch (e) {}

  // Upsert analysis
  db.run(
    `
    INSERT INTO ai_analyses (id, page_id, summary, traits, percentages, analysis_json, analyzed_at, comments_analyzed_count, status, needs_update, created_at, updated_at)
    VALUES (:id, :page_id, :summary, :traits, :percentages, :json, :now, :count, :status, 0, :now, :now)
    ON CONFLICT(page_id) DO UPDATE SET
      summary = :summary,
      traits = :traits,
      percentages = :percentages,
      analysis_json = :json,
      analyzed_at = :now,
      comments_analyzed_count = :count,
      status = :status,
      needs_update = 0,
      updated_at = :now
  `,
    {
      ':id': id,
      ':page_id': pageId,
      ':summary': summary,
      ':traits': traits,
      ':percentages': percentages,
      ':json': analysisJson,
      ':now': now,
      ':count': commentsCount,
      ':status': status,
    }
  );

  persistDatabase();
}

export function markAiAnalysisNeedsUpdate(pageId: string): void {
  const now = new Date().toISOString();
  const existing = getAiAnalysis(pageId);
  if (existing) {
    db.run(
      `UPDATE ai_analyses SET status = 'updating', needs_update = 1, updated_at = :now WHERE page_id = :page_id`,
      { ':page_id': pageId, ':now': now }
    );
  } else {
    const id = 'ai_' + crypto.randomBytes(6).toString('hex');
    db.run(
      `INSERT INTO ai_analyses (id, page_id, summary, traits, percentages, analysis_json, analyzed_at, comments_analyzed_count, status, needs_update, created_at, updated_at)
       VALUES (:id, :page_id, '', '[]', '[]', '{}', :now, 0, 'updating', 1, :now, :now)`,
      { ':id': id, ':page_id': pageId, ':now': now }
    );
  }
  persistDatabase();
}

export function getAiAnalysis(pageId: string): AiAnalysisData | null {
  const stmt = db.prepare('SELECT * FROM ai_analyses WHERE page_id = :page_id');
  stmt.bind({ ':page_id': pageId });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as AiAnalysisData;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Demo seeder for immediate rich experience
function seedInitialDataIfEmpty() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  let userCount = 0;
  if (countStmt.step()) {
    userCount = (countStmt.getAsObject() as { count: number }).count;
  }
  countStmt.free();

  if (userCount === 0) {
    const demoUserId = 'usr_demo_founder';
    const demoPageId = 'page_demo_1';
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO users (id, google_id, name, email, profile_image, created_at)
      VALUES (
        '${demoUserId}',
        'google_demo_10928374',
        'عمر عبد العزيز (Omar)',
        'omar.demo@example.com',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        '${now}'
      )
    `);

    db.run(`
      INSERT INTO pages (id, user_id, question, slug, max_comments, comments_count, is_active, created_at)
      VALUES (
        '${demoPageId}',
        '${demoUserId}',
        'ما أكثر صفة ترونها في شخصيتي بصراحة؟ وما الشيء الذي يجب أن أطوره؟',
        'omar-traits',
        50,
        14,
        1,
        '${now}'
      )
    `);

    const sampleComments = [
      { text: 'شخص قوي الشخصية وتعرف تتخذ قرارات في الأوقات الصعبة.', votes: 24 },
      { text: 'اجتماعي جداً والكل يحب يتكلم معك في التجمعات.', votes: 19 },
      { text: 'متعاون ودائماً تبادر بالمساعدة لما حد يحتاجك بدون تردد.', votes: 16 },
      { text: 'صاحب كاريزما وحضور قوي يلفت الانتباه.', votes: 15 },
      { text: 'طموح جداً ومثابر على أهدافك مهما كانت العوائق.', votes: 12 },
      { text: 'شخص طيب القلب ونيتك صافية مع الجميع.', votes: 10 },
      { text: 'أراك اجتماعياً ومحبوباً لكن تحتاج أحياناً تكون أكثر هدوءاً عند الغضب.', votes: 9 },
      { text: 'قائد بالفطرة وعندك حس مسؤولية عالي.', votes: 8 },
      { text: 'مستمع ممتاز وصبور على آراء الآخرين.', votes: 7 },
      { text: 'تحتاج تأخذ وقت للراحة ولا تضغط نفسك فوق طاقتها.', votes: 6 },
      { text: 'شجاع في قول كلمة الحق.', votes: 5 },
      { text: 'كريم وخدوم لأبعد الحدود.', votes: 5 },
      { text: 'ذكي وتلقط الفكرة بسرعة ماشاء الله.', votes: 4 },
      { text: 'شخصية قيادية واثقة من خطواتها.', votes: 4 },
    ];

    sampleComments.forEach((c, idx) => {
      const cId = `cmt_demo_${idx + 1}`;
      db.run(`
        INSERT INTO comments (id, page_id, anonymous_identifier, content, votes_count, is_hidden, created_at)
        VALUES ('${cId}', '${demoPageId}', 'anon_hash_${idx}', :content, ${c.votes}, 0, '${now}')
      `, { ':content': c.text });
    });

    persistDatabase();
  }
}

// Payment & Package Upgrade Database Functions
export function updatePageMaxComments(pageId: string, newMax: number): boolean {
  const page = getPageById(pageId);
  if (!page) return false;
  const now = new Date().toISOString();
  db.run('UPDATE pages SET max_comments = :max, updated_at = :now WHERE id = :id', {
    ':max': newMax,
    ':now': now,
    ':id': pageId,
  });
  persistDatabase();
  return true;
}

export function createPaymentRecord(data: {
  id: string;
  user_id: string;
  page_id: string;
  package: string;
  amount: number;
  currency: string;
  paypal_order_id: string;
  status: string;
}): Payment {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO payments (id, user_id, page_id, package, amount, currency, paypal_order_id, status, created_at, updated_at)
     VALUES (:id, :user_id, :page_id, :package, :amount, :currency, :order_id, :status, :now, :now)`,
    {
      ':id': data.id,
      ':user_id': data.user_id,
      ':page_id': data.page_id,
      ':package': data.package,
      ':amount': data.amount,
      ':currency': data.currency,
      ':order_id': data.paypal_order_id,
      ':status': data.status,
      ':now': now,
    }
  );
  persistDatabase();
  return {
    ...data,
    created_at: now,
    updated_at: now,
  };
}

export function getPaymentByOrderId(orderId: string): Payment | null {
  const stmt = db.prepare('SELECT * FROM payments WHERE paypal_order_id = :oid LIMIT 1');
  stmt.bind({ ':oid': orderId });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Payment;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function updatePaymentStatus(orderId: string, status: string, captureId?: string): boolean {
  const now = new Date().toISOString();
  if (captureId) {
    db.run(
      'UPDATE payments SET status = :status, paypal_capture_id = :cid, updated_at = :now WHERE paypal_order_id = :oid',
      {
        ':status': status,
        ':cid': captureId,
        ':now': now,
        ':oid': orderId,
      }
    );
  } else {
    db.run(
      'UPDATE payments SET status = :status, updated_at = :now WHERE paypal_order_id = :oid',
      {
        ':status': status,
        ':now': now,
        ':oid': orderId,
      }
    );
  }
  persistDatabase();
  return true;
}

export function getUserPayments(userId: string): Payment[] {
  const stmt = db.prepare('SELECT * FROM payments WHERE user_id = :uid ORDER BY created_at DESC');
  stmt.bind({ ':uid': userId });
  const list: Payment[] = [];
  while (stmt.step()) {
    list.push(stmt.getAsObject() as unknown as Payment);
  }
  stmt.free();
  return list;
}
