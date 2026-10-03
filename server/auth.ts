import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, createOrUpdateUser, getUserById } from './db.js';

// Simple signed session store / JWT-like token for user sessions
const SESSION_SECRET = process.env.SESSION_SECRET || 'baseera-secret-token-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Generate token: base64(userId:timestamp:signature)
export function createSessionToken(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, timestamp, signature] = parts;

    // Check expiration (e.g., 30 days)
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const payload = `${userId}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (expectedSig === signature) {
      return userId;
    }
  } catch (err) {
    return null;
  }
  return null;
}

// Middleware to extract user
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.baseera_session) {
    token = req.cookies.baseera_session;
  }

  if (token) {
    const userId = verifySessionToken(token);
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        req.user = user;
      }
    }
  }

  next();
}

// Require authenticated user
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للمتابعة.' });
    return;
  }
  next();
}

// Parse Google JWT ID Token (payload is base64 JSON)
export function parseGoogleCredential(credentialToken: string): {
  sub: string;
  name: string;
  email: string;
  picture: string;
} | null {
  try {
    const parts = credentialToken.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    const data = JSON.parse(payload);
    return {
      sub: data.sub,
      name: data.name || data.email?.split('@')[0] || 'User',
      email: data.email || '',
      picture: data.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };
  } catch (err) {
    console.error('Error parsing Google credential:', err);
    return null;
  }
}

// Anonymous identifier generator: Hashes IP + visitor salt to prevent exposing client info
export function getAnonymousIdentifier(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  const clientCookieId = req.cookies?.baseera_vid || '';

  // Combine them with a daily salt so it's consistent for duplicate vote checks, but irreversible and privacy-preserving
  return crypto
    .createHash('sha256')
    .update(`${ip}-${userAgent}-${clientCookieId}-${process.env.ANON_SALT || 'salt_baseera_2026'}`)
    .digest('hex')
    .substring(0, 24);
}
