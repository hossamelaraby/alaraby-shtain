import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const courseId = new URL(req.url).searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 });

  const { data, error } = await check.supabase
    .from('videos')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data });
}

export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { course_id, title, storage_path, duration_seconds, order_index, unlock_after_days } =
    await req.json();

  if (!course_id || !title || !storage_path) {
    return NextResponse.json(
      { error: 'course_id وtitle وstorage_path مطلوبين (storage_path = نفس video-id اللي رفعته بـ upload-video.js)' },
      { status: 400 }
    );
  }

  const { data, error } = await check.supabase
    .from('videos')
    .insert({
      course_id,
      title,
      storage_path,
      duration_seconds: duration_seconds || null,
      order_index: order_index || 0,
      unlock_after_days: unlock_after_days || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}
