import { NextResponse } from 'next/server';
import { verifyVideoToken } from '@/lib/video-token';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(req, { params }) {
  const { videoId } = params;
  const token = new URL(req.url).searchParams.get('token');

  const { valid, payload } = verifyVideoToken(token);
  if (!valid || payload.vid !== videoId) {
    return new NextResponse('رابط منتهي أو غير صالح', { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: video } = await supabase
    .from('videos')
    .select('storage_path')
    .eq('id', videoId)
    .single();

  if (!video) return new NextResponse('غير موجود', { status: 404 });

  // تنزيل الـ manifest نفسه من الـ bucket الخاص (Service Role يتخطى الحاجة لـ signed URL هنا)
  const { data: fileData, error } = await supabase.storage
    .from('encrypted-videos')
    .download(`${video.storage_path}/playlist.m3u8`);

  if (error) return new NextResponse('تعذر تحميل الفيديو', { status: 500 });

  let content = await fileData.text();

  // إعادة كتابة كل سطر segment ليمر عبر route الـ segment بتاعنا (نفس التوكن)
  content = content
    .split('\n')
    .map((line) => {
      if (line.endsWith('.ts')) {
        return `/api/videos/${videoId}/segment/${line}?token=${token}`;
      }
      if (line.startsWith('#EXT-X-KEY')) {
        return line.replace(
          /URI="[^"]+"/,
          `URI="/api/videos/${videoId}/key?token=${token}"`
        );
      }
      return line;
    })
    .join('\n');

  return new NextResponse(content, {
    headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
  });
}
