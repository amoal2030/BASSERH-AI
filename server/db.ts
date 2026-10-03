import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app.sqlite');

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
  owner_name?: string;
  owner_image?: string;
}

export interface Comment {
  id: string;
  page_id: string;
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
  analysis_json: string;
  analyzed_at: string;
  comments_analyzed_count: number;
}

// Persist the SQLite database to file
export function persistDatabase() {
  if (!db) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
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
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      anonymous_identifier TEXT NOT NULL,
      content TEXT NOT NULL,
      votes_count INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
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
      analysis_json TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      comments_analyzed_count INTEGER NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `);

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

export function createOrUpdateUser(user: {
  id: string;
  google_id: string;
  name: string;
  email: string;
  profile_image: string;
}): User {
  const existing = getUserByGoogleId(user.google_id);
  const now = new Date().toISOString();

  if (existing) {
    db.run(
      'UPDATE users SET name = :name, email = :email, profile_image = :image WHERE id = :id',
      {
        ':id': existing.id,
        ':name': user.name,
        ':email': user.email,
        ':image': user.profile_image,
      }
    );
    persistDatabase();
    return { ...existing, name: user.name, email: user.email, profile_image: user.profile_image };
  } else {
    db.run(
      'INSERT INTO users (id, google_id, name, email, profile_image, created_at) VALUES (:id, :google_id, :name, :email, :image, :created_at)',
      {
        ':id': user.id,
        ':google_id': user.google_id,
        ':name': user.name,
        ':email': user.email,
        ':image': user.profile_image,
        ':created_at': now,
      }
    );
    persistDatabase();
    return {
      id: user.id,
      google_id: user.google_id,
      name: user.name,
      email: user.email,
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
    'INSERT INTO pages (id, user_id, question, slug, max_comments, comments_count, is_active, created_at) VALUES (:id, :user_id, :question, :slug, :max, 0, 1, :created_at)',
    {
      ':id': params.id,
      ':user_id': params.user_id,
      ':question': params.question,
      ':slug': params.slug,
      ':max': maxComments,
      ':created_at': now,
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

  const newStatus = page.is_active === 1 ? 0 : 1;
  db.run('UPDATE pages SET is_active = :status WHERE id = :id', {
    ':status': newStatus,
    ':id': pageId,
  });
  persistDatabase();
  return true;
}

export function deletePage(pageId: string, userId: string): boolean {
  const page = getPageById(pageId);
  if (!page || page.user_id !== userId) return false;

  db.run('DELETE FROM pages WHERE id = :id', { ':id': pageId });
  db.run('DELETE FROM comments WHERE page_id = :id', { ':id': pageId });
  db.run('DELETE FROM ai_analyses WHERE page_id = :id', { ':id': pageId });
  persistDatabase();
  return true;
}

// Comments functions
export function addComment(params: {
  id: string;
  page_id: string;
  anonymous_identifier: string;
  content: string;
}): { success: boolean; comment?: Comment; error?: string } {
  const page = getPageById(params.page_id);
  if (!page) {
    return { success: false, error: 'الصفحة غير موجودة' };
  }

  if (page.is_active === 0) {
    return { success: false, error: 'تم إيقاف استقبال التعليقات على هذه الصفحة مؤقتاً من قبل صاحبها.' };
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
  db.run(
    'INSERT INTO comments (id, page_id, anonymous_identifier, content, votes_count, is_hidden, created_at) VALUES (:id, :page_id, :anon, :content, 0, 0, :created_at)',
    {
      ':id': params.id,
      ':page_id': params.page_id,
      ':anon': params.anonymous_identifier,
      ':content': params.content,
      ':created_at': now,
    }
  );

  // Update page comments_count
  db.run('UPDATE pages SET comments_count = comments_count + 1 WHERE id = :page_id', {
    ':page_id': params.page_id,
  });

  persistDatabase();

  return {
    success: true,
    comment: {
      id: params.id,
      page_id: params.page_id,
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

  db.run('DELETE FROM comments WHERE id = :id', { ':id': commentId });
  db.run('DELETE FROM votes WHERE comment_id = :id', { ':id': commentId });
  db.run('DELETE FROM reports WHERE comment_id = :id', { ':id': commentId });
  db.run('UPDATE pages SET comments_count = MAX(0, comments_count - 1) WHERE id = :page_id', {
    ':page_id': comment.page_id,
  });

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
export function saveAiAnalysis(pageId: string, analysisJson: string, commentsCount: number): void {
  const now = new Date().toISOString();
  const id = 'ai_' + Math.random().toString(36).substring(2, 10);

  // Upsert analysis
  db.run(`
    INSERT INTO ai_analyses (id, page_id, analysis_json, analyzed_at, comments_analyzed_count)
    VALUES (:id, :page_id, :json, :now, :count)
    ON CONFLICT(page_id) DO UPDATE SET
      analysis_json = :json,
      analyzed_at = :now,
      comments_analyzed_count = :count
  `, {
    ':id': id,
    ':page_id': pageId,
    ':json': analysisJson,
    ':now': now,
    ':count': commentsCount,
  });

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

    // Seed analysis for demo page
    const sampleAnalysis = {
      totalComments: 14,
      summary: "استناداً إلى 14 تعليقاً مجهولاً، أجمع أغلب المشاركين على أنك تتمتع بشخصية قوية ومبادرة، مع حضور اجتماعي لافت وروح تعاونية ملحوظة، مع نصيحة رقيقة بضرورة أخذ قسط من الراحة والهدوء عند ضغوطات العمل.",
      summaryEn: "Based on 14 anonymous comments, participants highlighted your strong leadership, sociable presence, and willingness to help others, along with friendly advice to pace yourself and manage stress calmly.",
      dominantTrait: {
        trait: "قوة الشخصية والقيادة",
        traitEn: "Strong Personality & Leadership",
        count: 8,
        percentage: 57
      },
      topTraits: [
        {
          trait: "قوة الشخصية والقيادة",
          traitEn: "Strong Personality & Leadership",
          count: 8,
          percentage: 57,
          category: "strength",
          explanation: "ذكر 8 من أصل 14 تعليقاً كلمات صريحة حول قوة الشخصية، القيادة بالفطرة، والجسارة في اتخاذ القرارات."
        },
        {
          trait: "الاجتماعية والمحبة",
          traitEn: "Sociable & Likable",
          count: 6,
          percentage: 43,
          category: "strength",
          explanation: "تكرر وصفك بالشخص الاجتماعي والمحبوب ذو الحضور البارز في التجمعات في 6 تعليقات."
        },
        {
          trait: "التعاون وخدمة الآخرين",
          traitEn: "Cooperative & Helpful",
          count: 5,
          percentage: 36,
          category: "strength",
          explanation: "أشاد 5 معلقين بروح المبادرة ومساعدتك للآخرين وطيبة القلب."
        },
        {
          trait: "الطموح والمثابرة",
          traitEn: "Ambition & Drive",
          count: 4,
          percentage: 29,
          category: "strength",
          explanation: "أشار 4 معلقين إلى إصرارك على أهدافك والذكاء السريع."
        },
        {
          trait: "الحاجة للهدوء وتخفيف الضغط",
          traitEn: "Need for Calm & Rest",
          count: 3,
          percentage: 21,
          category: "growth",
          explanation: "اقترح 3 معلقين نصائح بناءة بخصوص تجنب الغضب وأخذ وقت كافٍ للراحة وعدم إرهاق النفس."
        }
      ],
      positiveThemes: [
        "القدرة العالية على توجيه الأمور وحسم المواقف",
        "روح إيجابية تجعل الجلسات ممتعة",
        "الأمانة وحب الخير للناس"
      ],
      constructiveCritiques: [
        "التأني والهدوء عند مواجهة لحظات الغضب أو التوتر",
        "الموازنة بين خدمة الآخرين والاهتمام براحتك الشخصية"
      ],
      disclaimer: "هذه النتائج والنسب مبنية حصرياً على تكرار آراء الأشخاص الذين شاركوا في التعليق، وليست تقييماً نفسياً أو حكماً علمياً مطلقاً."
    };

    db.run(`
      INSERT INTO ai_analyses (id, page_id, analysis_json, analyzed_at, comments_analyzed_count)
      VALUES ('ai_seed_1', '${demoPageId}', :json, '${now}', 14)
    `, { ':json': JSON.stringify(sampleAnalysis) });

    persistDatabase();
  }
}
