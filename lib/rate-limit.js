import { Redis } from '@upstash/redis';

// التحقق من وجود مفاتيح Upstash لمنع توقف السيرفر عند غيابها
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// مخزن مؤقت fallback عند عدم إعداد Upstash في بيئة التطوير
const memoryStore = new Map();

export const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * تسجيل جلسة نشطة جديدة - جلسة واحدة بس لكل مستخدم في نفس الوقت.
 * لو بصمة الجهاز الجديدة مختلفة عن المسجلة، القديمة بتتلغى تلقائيًا.
 */
export async function registerSingleSession(userId, fingerprint) {
  if (redis) {
    await redis.set(`session:${userId}`, fingerprint, { ex: 60 * 30 }); // 30 دقيقة
  } else {
    memoryStore.set(`session:${userId}`, { value: fingerprint, exp: Date.now() + 30 * 60 * 1000 });
  }
}

export async function isSessionValid(userId, fingerprint) {
  if (redis) {
    const stored = await redis.get(`session:${userId}`);
    return stored === fingerprint;
  }
  const entry = memoryStore.get(`session:${userId}`);
  if (!entry || entry.exp < Date.now()) return true;
  return entry.value === fingerprint;
}

/**
 * كشف السلوك الآلي: عدّاد طلبات فيديو لكل مستخدم في نافذة دقيقة واحدة.
 */
export async function trackAndCheckAbuse(userId, threshold = 30) {
  if (redis) {
    const key = `videoreq:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    return count > threshold;
  }
  return false;
}

export async function lockAccount(userId, reason) {
  if (redis) {
    await redis.set(`locked:${userId}`, reason, { ex: 60 * 60 * 24 });
  } else {
    memoryStore.set(`locked:${userId}`, { value: reason, exp: Date.now() + 24 * 60 * 60 * 1000 });
  }
}

export async function isLocked(userId) {
  if (redis) {
    return redis.get(`locked:${userId}`);
  }
  const entry = memoryStore.get(`locked:${userId}`);
  if (entry && entry.exp >= Date.now()) return entry.value;
  return null;
}
