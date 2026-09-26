import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { resolveAuthUser } from '@/lib/auth-helper';

export async function POST(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const user = await resolveAuthUser(authHeader.replace('Bearer ', ''));
  if (!user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }

  const { video_id, watched_seconds, completed } = await req.json();
  if (!video_id) return NextResponse.json({ error: 'video_id مطلوب' }, { status: 400 });

  const { error: upsertError } = await supabase.from('video_progress').upsert({
    user_id: user.id,
    video_id,
    watched_seconds: watched_seconds || 0,
    completed: !!completed,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
