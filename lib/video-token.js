import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.VIDEO_JWT_SECRET || 'alaraby_shtain_physics_video_secret_default_key_2026';

export function buildFingerprint({ ip, userAgent, clientFp }) {
  const ipRange = (ip || '').split('.').slice(0, 3).join('.');
  const raw = `${ipRange}|${userAgent}|${clientFp || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function issueVideoToken(userId, videoId, fingerprint, ttlSeconds = 90) {
  return jwt.sign(
    { sub: userId, vid: videoId, fp: fingerprint },
    JWT_SECRET,
    { expiresIn: `${ttlSeconds}s` }
  );
}

export function verifyVideoToken(token) {
  try {
    return { valid: true, payload: jwt.verify(token, JWT_SECRET) };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
