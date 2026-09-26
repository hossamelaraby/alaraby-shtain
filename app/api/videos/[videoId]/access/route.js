import { NextResponse } from 'next/server';
import { verifyRequest, checkEnrollment, checkTosAccepted, logAccess, recordSecurityEvent } from '@/lib/video-guard';
import { registerSingleSession } from '@/lib/rate-limit';
import { issueVideoToken } from '@/lib/video-token';

export async function POST(req, { params }) {
  const { videoId } = params;

  const check = await verifyRequest(req);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  const { userId, fingerprint, supabase, ip, userAgent } = check;

  // 1) لازم يكون قابل اتفاقية الاستخدام قبل أي وصول لأي فيديو
  const tosOk = await checkTosAccepted(supabase, userId);
  if (!tosOk) {
    return NextResponse.json({ error: 'يجب الموافقة على اتفاقية الاستخدام أولاً', code: 'TOS_REQUIRED' }, { status: 403 });
  }

  // تسجيل هذه الجلسة كالجلسة الوحيدة النشطة
  await registerSingleSession(userId, fingerprint);

  // 2) التحقق من الاشتراك + drip content (موعد فتح الفيديو)
  const { enrolled, video, locked_until } = await checkEnrollment(supabase, userId, videoId, check.userRole);
  if (!enrolled) return NextResponse.json({ error: 'غير مشترك في هذا الكورس' }, { status: 403 });
  if (!video && locked_until) {
    return NextResponse.json(
      { error: `هذا الفيديو يُفتح في ${new Date(locked_until).toLocaleDateString('ar-EG')}`, code: 'DRIP_LOCKED' },
      { status: 403 }
    );
  }
  if (!video) return NextResponse.json({ error: 'الفيديو غير موجود' }, { status: 404 });

  await logAccess(supabase, { userId, videoId, ip, userAgent });

  const { parseVideoSource } = await import('@/lib/video-parser');
  const source = parseVideoSource(video.storage_path);

  if (source.type === 'youtube') {
    return NextResponse.json({
      videoType: 'youtube',
      youtubeId: source.youtubeId,
      embedUrl: source.embedUrl,
      title: video.title,
      expiresInSeconds: 3600,
    });
  }

  if (source.type === 'direct_url') {
    return NextResponse.json({
      videoType: 'direct',
      videoUrl: source.url,
      title: video.title,
      expiresInSeconds: 3600,
    });
  }

  if (source.type === 'hls_url') {
    return NextResponse.json({
      videoType: 'hls',
      manifestUrl: source.url,
      title: video.title,
      expiresInSeconds: 3600,
    });
  }

  const token = issueVideoToken(userId, videoId, fingerprint, 90);

  return NextResponse.json({
    videoType: 'hls',
    manifestUrl: `/api/videos/${videoId}/manifest?token=${token}`,
    expiresInSeconds: 90,
  });
}

/**
 * راوت لتسجيل حدث "المستخدم بدّل التبويب أثناء التشغيل"
 * يُستدعى من الفرونت إند (Page Visibility API) - ردع نفسي + دليل تتبع، مش منع تقني حقيقي.
 */
export async function PATCH(req, { params }) {
  const { videoId } = params;
  const check = await verifyRequest(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => ({}));
  await recordSecurityEvent(check.supabase, {
    userId: check.userId,
    eventType: 'tab_hidden_during_playback',
    details: { videoId, ...body },
  });

  return NextResponse.json({ logged: true });
}
