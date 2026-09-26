import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { title, body, course_id } = await req.json();
  if (!title) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });

  const { data, error } = await check.supabase
    .from('announcements')
    .insert({ title, body, course_id: course_id || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}
