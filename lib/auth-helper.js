import { createServiceClient } from './supabase-server';
import { verifyVideoToken } from './video-token';

/**
 * معالج موحد للجلسات والمصادقة:
 * يتحقق أولاً من جلسة Supabase، وإذا كانت غير متوفرة أو لم تفعل بعد خدمات السيرفر الخارجية،
 * يتحقق بأمان من توكن المنصة المشفر لضمان عمل الدخول بنسبة 100% في كافة الظروف.
 */
export async function resolveAuthUser(accessToken) {
  if (!accessToken) return null;

  const supabase = createServiceClient();

  // 1. التحقق عبر Supabase Auth
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      return {
        id: data.user.id,
        email: data.user.email || data.user.phone || 'student@alaraby-shtain.com',
        role: profile?.role || 'student',
        isSupabase: true,
      };
    }
  } catch (err) {}

  // 2. التحقق الاحتياطي عبر توكن المنصة المشفر
  const verified = verifyVideoToken(accessToken);
  if (verified.valid && verified.payload) {
    return {
      id: verified.payload.sub || verified.payload.id || 'student-1',
      email: verified.payload.email || 'student@alaraby-shtain.com',
      role: verified.payload.role || 'student',
      isSupabase: false,
    };
  }

  return null;
}
