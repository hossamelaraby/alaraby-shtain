import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const { supabase } = check;

  const [{ count: coursesCount }, { count: studentsCount }, { count: enrollmentsCount }, { count: codesUnused }] =
    await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('enrollment_codes').select('*', { count: 'exact', head: true }).is('used_by', null),
    ]);

  return NextResponse.json({
    coursesCount: coursesCount || 0,
    studentsCount: studentsCount || 0,
    enrollmentsCount: enrollmentsCount || 0,
    codesUnused: codesUnused || 0,
  });
}
