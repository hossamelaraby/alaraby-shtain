import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { lockAccount, isLocked } from '@/lib/rate-limit';

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  // نجيب كل الطلاب (role = student) من جدول profiles
  const { data: students, error } = await check.supabase
    .from('profiles')
    .select('id, email, phone, full_name, role, accepted_tos, is_blocked, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // جلب عدد اشتراكات كل طالب
  const { data: enrollments } = await check.supabase
    .from('enrollments')
    .select('user_id');

  const counts = {};
  (enrollments || []).forEach((e) => {
    counts[e.user_id] = (counts[e.user_id] || 0) + 1;
  });

  // دمج حالة القفل من قاعدة البيانات وRedis
  const withLockStatus = await Promise.all(
    (students || []).map(async (s) => ({
      ...s,
      enrollments_count: counts[s.id] || 0,
      locked: !!s.is_blocked || !!(await isLocked(s.id)),
    }))
  );

  return NextResponse.json({ students: withLockStatus });
}

/**
 * إجراءات الأدمن على طالب معيّن: حظر / فك حظر / إلغاء اشتراك من كورس محدد
 */
export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { action, student_id, course_id, reason } = await req.json();

  if (action === 'lock') {
    await lockAccount(student_id, reason || 'تم الحظر يدويًا من الأدمن');
    await check.supabase.from('profiles').update({ is_blocked: true }).eq('id', student_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'unlock') {
    const { redis } = await import('@/lib/rate-limit');
    if (redis) await redis.del(`locked:${student_id}`);
    await check.supabase.from('profiles').update({ is_blocked: false }).eq('id', student_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'revoke_enrollment') {
    if (!course_id) return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 });
    const { error } = await check.supabase
      .from('enrollments')
      .delete()
      .eq('user_id', student_id)
      .eq('course_id', course_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
}
