// Basic abuse prevention, threat detection, and rate limiting

// Toxic patterns and threat detection (Arabic + English)
const HARMFUL_PATTERNS = [
  // Threats & violence
  /سأقتلك|ساقتلك|اقتلك|اموتك|هدد|اذبحك|اذيك|سأفضحك|سافضحك/i,
  /kill you|gonna hurt you|die|threaten|murder/i,
  // Severe slurs & harassment
  /يا كلب|يا حمار|يا حيوان|يا وقح|لعنة|قذر|شحات|منحط/i,
  /bitch|bastard|idiot|hate you|trash/i,
  // Phone numbers / personal doxxing attempts
  /(05\d{8}|\+966\d{9}|\+20\d{10}|\+971\d{8}|\+965\d{8}|01\d{9})/g,
];

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimits = new Map<string, RateLimitEntry>();

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const windowTime = 10 * 60 * 1000;
  for (const [key, entry] of rateLimits.entries()) {
    entry.timestamps = entry.timestamps.filter(t => now - t < windowTime);
    if (entry.timestamps.length === 0) {
      rateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkHarmfulContent(text: string): { safe: boolean; reason?: string } {
  const trimmed = text.trim();

  if (trimmed.length < 2) {
    return { safe: false, reason: 'التعليق قصير جداً.' };
  }

  if (trimmed.length > 500) {
    return { safe: false, reason: 'تجاوز التعليق الحد المسموح (500 حرف كحد أقصى).' };
  }

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: 'تم حظر التعليق لاحتوائه على عبارات غير لائقة أو أرقام هاتف أو تهديدات تخرق سياسة الاستخدام.',
      };
    }
  }

  return { safe: true };
}

export function checkRateLimit(
  identifier: string,
  pageId: string,
  maxPerWindow: number = 5,
  windowMinutes: number = 10
): { allowed: boolean; waitSeconds?: number } {
  const key = `${identifier}_${pageId}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  let entry = rateLimits.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimits.set(key, entry);
  }

  // Filter timestamps within window
  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

  // Check minimum interval between 2 consecutive comments (e.g., 10 seconds)
  if (entry.timestamps.length > 0) {
    const lastTime = entry.timestamps[entry.timestamps.length - 1];
    if (now - lastTime < 10000) {
      const waitSeconds = Math.ceil((10000 - (now - lastTime)) / 1000);
      return { allowed: false, waitSeconds };
    }
  }

  if (entry.timestamps.length >= maxPerWindow) {
    const oldest = entry.timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}
