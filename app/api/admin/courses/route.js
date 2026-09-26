import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data, error } = await check.supabase
    .from('courses')
    .select('*, videos(count), enrollments(count)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data });
}

export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { title, description, price } = await req.json();
  if (!title) return NextResponse.json({ error: 'اسم الكورس مطلوب' }, { status: 400 });

  const { data, error } = await check.supabase
    .from('courses')
    .insert({ title, description, price: price || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}
