import { NextResponse } from 'next/server';
import { verifyVideoToken } from '@/lib/video-token';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(req, { params }) {
  const { videoId } = params;
  const token = new URL(req.url).searchParams.get('token');

  const { valid, payload } = verifyVideoToken(token);
  if (!valid || payload.vid !== videoId) {
    return new NextResponse('غير مصرح', { status: 401 });
  }

  const supabase = createServiceClient();

  // المفاتيح مخزّنة في bucket خاص منفصل تمامًا اسمه "video-keys"
  // (لازم تنشئه في Supabase منفصل عن bucket الفيديوهات المشفرة)
  const { data: keyData, error } = await supabase.storage
    .from('video-keys')
    .download(`${videoId}/key.bin`);

  if (error) return new NextResponse('غير موجود', { status: 404 });

  // تسجيل كل سحب مفتاح - أهم سطر في نظام التتبع كله
  console.log(
    `[KEY-ACCESS] user=${payload.sub} video=${videoId} time=${new Date().toISOString()}`
  );

  const buffer = await keyData.arrayBuffer();
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}
