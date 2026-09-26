import { redis } from './rate-limit';
import crypto from 'crypto';

/**
 * يولّد كود OTP من 6 أرقام، يخزّنه في Redis لمدة 5 دقائق مربوطًا بالمستخدم+الجهاز.
 * الإرسال الفعلي للإيميل عبر خدمة مجانية زي Resend (100 إيميل/يوم مجانًا) - راجع send-otp-email.js
 */
export async function generateOtp(userId, fingerprint) {
  const code = crypto.randomInt(100000, 999999).toString();
  const key = `otp:${userId}:${fingerprint}`;
  await redis.set(key, code, { ex: 60 * 5 });
  return code;
}

export async function verifyOtp(userId, fingerprint, submittedCode) {
  const key = `otp:${userId}:${fingerprint}`;
  const stored = await redis.get(key);
  if (!stored) return { valid: false, reason: 'expired' };
  if (stored !== submittedCode) return { valid: false, reason: 'mismatch' };
  await redis.del(key);
  return { valid: true };
}

/**
 * منع محاولات تخمين الكود بشكل متكرر (brute force على الـ OTP نفسه)
 */
export async function trackOtpAttempt(userId, fingerprint, maxAttempts = 5) {
  const key = `otp_attempts:${userId}:${fingerprint}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 5);
  return count > maxAttempts;
}
