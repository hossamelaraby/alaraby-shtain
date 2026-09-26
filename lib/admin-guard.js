import { createServiceClient } from './supabase-server';
import { resolveAuthUser } from './auth-helper';

/**
 * يتحقق إن صاحب الطلب مسجل دخول وعنده role = admin فعليًا.
 * تُستخدم في بداية أي API route إداري (كورسات، دروس، أكواد، إعدادات).
 */
export async function requireAdmin(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');

  if (!accessToken) return { ok: false, status: 401, error: 'مطلوب تسجيل الدخول' };

  const user = await resolveAuthUser(accessToken);
  if (!user) {
    return { ok: false, status: 401, error: 'جلسة غير صالحة' };
  }

  if (user.role !== 'admin') {
    return { ok: false, status: 403, error: 'هذا الإجراء متاح للأدمن (مستر محمد العربي) فقط' };
  }

  return { ok: true, userId: user.id, supabase };
}

/**
 * توليد كود عشوائي بصيغة سهلة القراءة والكتابة يدويًا: XXXX-XXXX
 */
export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return `${part1}-${part2}`;
}
