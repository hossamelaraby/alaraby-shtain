import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { lockAccount, isLocked } from '@/lib/rate-limit';

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  // نجيب كل الطلاب (role = student) مع عدد كورساتهم
  const { data: students, error } = await check.supabase
    .from('profiles')
    .select('id, email, role, accepted_tos, created_at, enrollments(count)')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // نضيف حالة القفل لكل طالب (مخزّنة في Redis مش في قاعدة البيانات)
  const withLockStatus = await Promise.all(
    students.map(async (s) => ({
      ...s,
      locked: !!(await isLocked(s.id)),
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
    return NextResponse.json({ success: true });
  }

  if (action === 'unlock') {
    const { redis } = await import('@/lib/rate-limit');
    await redis.del(`locked:${student_id}`);
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
