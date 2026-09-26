import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { buildFingerprint } from '@/lib/video-token';
import { verifyOtp, trackOtpAttempt } from '@/lib/otp';
import { recordSecurityEvent } from '@/lib/video-guard';

export async function POST(req) {
  const { code } = await req.json();

  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');
  const supabase = createServiceClient();

  const { data: userData, error } = await supabase.auth.getUser(accessToken);
  if (error || !userData?.user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }
  const userId = userData.user.id;

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const clientFp = req.headers.get('x-client-fp') || '';
  const fingerprint = buildFingerprint({ ip, userAgent, clientFp });

  // منع محاولات التخمين المتكررة
  const tooManyAttempts = await trackOtpAttempt(userId, fingerprint);
  if (tooManyAttempts) {
    return NextResponse.json({ error: 'محاولات كثيرة جدًا، حاول لاحقًا' }, { status: 429 });
  }

  const result = await verifyOtp(userId, fingerprint, code);
  if (!result.valid) {
    return NextResponse.json({ error: 'كود غير صحيح أو منتهي' }, { status: 400 });
  }

  // توثيق الجهاز عشان مايتطلبش OTP تاني من نفس الجهاز
  await supabase.from('trusted_devices').upsert({ user_id: userId, fingerprint });

  await recordSecurityEvent(supabase, {
    userId,
    eventType: 'new_device_verified',
    details: { ip, userAgent },
  });

  return NextResponse.json({ verified: true });
}
