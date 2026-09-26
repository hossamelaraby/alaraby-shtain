import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { buildFingerprint } from '@/lib/video-token';
import { isDeviceTrusted, recordSecurityEvent } from '@/lib/video-guard';
import { generateOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/send-otp-email';

export async function POST(req) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');
  const supabase = createServiceClient();

  const { data: userData, error } = await supabase.auth.getUser(accessToken);
  if (error || !userData?.user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }
  const userId = userData.user.id;
  const email = userData.user.email;

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const clientFp = req.headers.get('x-client-fp') || '';
  const fingerprint = buildFingerprint({ ip, userAgent, clientFp });

  const trusted = await isDeviceTrusted(supabase, userId, fingerprint);
  if (trusted) {
    return NextResponse.json({ requiresOtp: false });
  }

  const code = await generateOtp(userId, fingerprint);
  await sendOtpEmail(email, code);

  await recordSecurityEvent(supabase, {
    userId,
    eventType: 'new_device_login_attempt',
    details: { ip, userAgent },
  });

  return NextResponse.json({ requiresOtp: true });
}
