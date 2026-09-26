import { NextResponse } from 'next/server';
import { verifyVideoToken } from '@/lib/video-token';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(req, { params }) {
  const { videoId, seg } = params;
  const token = new URL(req.url).searchParams.get('token');

  const { valid, payload } = verifyVideoToken(token);
  if (!valid || payload.vid !== videoId) {
    return new NextResponse('رابط منتهي', { status: 401 });
  }

  // منع path traversal بشكل صارم
  if (!seg || seg.includes('..') || seg.includes('/') || !seg.endsWith('.ts')) {
    return new NextResponse('طلب غير صالح', { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: video } = await supabase
    .from('videos')
    .select('storage_path')
    .eq('id', videoId)
    .single();

  if (!video) return new NextResponse('غير موجود', { status: 404 });

  const { data: fileData, error } = await supabase.storage
    .from('encrypted-videos')
    .download(`${video.storage_path}/${seg}`);

  if (error) return new NextResponse('غير موجود', { status: 404 });

  const buffer = await fileData.arrayBuffer();
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'video/mp2t' },
  });
}
