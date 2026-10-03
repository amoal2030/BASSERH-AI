/**
 * Centralized API helper for Baseera AI
 * Automatically attaches session token in Authorization Bearer header
 * and includes credentials for seamless cookie & token-based auth
 */

const TOKEN_KEY = 'baseera_token';
const USER_KEY = 'baseera_user';

export function getStoredToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t || t === 'null' || t === 'undefined' || t.trim() === '') return null;
    return t;
  } catch (e) {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {}
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {}
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user: any): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {}
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

let cachedAppBaseUrl = '';

export function setAppBaseUrl(url: string): void {
  if (url && typeof url === 'string') {
    cachedAppBaseUrl = url.trim().replace(/\/+$/, '');
  }
}

/**
 * Generates the shareable URL for question pages using /q/{slug}
 * Supports custom domain from VITE_APP_BASE_URL, cached backend URL, or current window.location.origin
 */
export function getPublicShareUrl(slug: string): string {
  const cleanSlug = slug.replace(/^\/+/, '').replace(/^(q|u)\//, '');
  const envBase = (import.meta as any).env?.VITE_APP_BASE_URL;
  if (envBase && typeof envBase === 'string' && envBase.trim()) {
    return `${envBase.trim().replace(/\/+$/, '')}/q/${cleanSlug}`;
  }
  if (cachedAppBaseUrl) {
    return `${cachedAppBaseUrl}/q/${cleanSlug}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/q/${cleanSlug}`;
  }
  return `/q/${cleanSlug}`;
}

/**
 * Cross-platform clipboard copy with fallback for older iOS Safari & in-app webviews
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
}

/**
 * Web Share API helper with automatic fallback to clipboard copy
 */
export async function shareQuestion(data: {
  title: string;
  text: string;
  url: string;
}): Promise<{ shared: boolean; method: 'native' | 'clipboard' | 'cancelled' }> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'cancelled' };
      }
    }
  }

  const copied = await copyToClipboard(data.url);
  return { shared: copied, method: 'clipboard' };
}
