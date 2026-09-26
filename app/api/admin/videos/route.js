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

  const { course_id, title, storage_path, duration_seconds, order_index, unlock_after_days, description } =
    await req.json();

  if (!course_id || !title || !storage_path) {
    return NextResponse.json(
      { error: 'عنوان المحاضرة ورابط أو معرّف الفيديو مطلوبين' },
      { status: 400 }
    );
  }

  const { data, error } = await check.supabase
    .from('videos')
    .insert({
      course_id,
      title: title.trim(),
      storage_path: storage_path.trim(),
      duration_seconds: duration_seconds || null,
      order_index: Number(order_index) || 0,
      unlock_after_days: Number(unlock_after_days) || 0,
      description: description ? description.trim() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'فشل حفظ المحاضرة: ' + error.message }, { status: 500 });
  return NextResponse.json({ success: true, video: data });
}

export async function PUT(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id, title, storage_path, duration_seconds, order_index, unlock_after_days, description } =
    await req.json();

  if (!id) {
    return NextResponse.json({ error: 'معرف المحاضرة (id) مطلوب' }, { status: 400 });
  }

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (storage_path !== undefined) updates.storage_path = storage_path.trim();
  if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds;
  if (order_index !== undefined) updates.order_index = Number(order_index);
  if (unlock_after_days !== undefined) updates.unlock_after_days = Number(unlock_after_days);
  if (description !== undefined) updates.description = description ? description.trim() : null;

  const { data, error } = await check.supabase
    .from('videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'فشل تعديل المحاضرة: ' + error.message }, { status: 500 });
  return NextResponse.json({ success: true, video: data });
}

export async function DELETE(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'معرف المحاضرة (id) مطلوب' }, { status: 400 });

  const { error } = await check.supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'فشل حذف المحاضرة: ' + error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
