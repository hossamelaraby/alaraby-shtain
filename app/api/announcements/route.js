import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { resolveAuthUser } from '@/lib/auth-helper';

export async function GET(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');

  const user = await resolveAuthUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id);

  const courseIds = (enrollments || []).map((e) => e.course_id);

  // إعلانات عامة (course_id فاضي) + إعلانات خاصة بكورساته
  const { data, error: annError } = await supabase
    .from('announcements')
    .select('id, title, body, created_at, course_id')
    .or(`course_id.is.null${courseIds.length ? ',course_id.in.(' + courseIds.join(',') + ')' : ''}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (annError) return NextResponse.json({ error: annError.message }, { status: 500 });
  return NextResponse.json({ announcements: data || [] });
}
