import { createServiceClient } from './supabase-server';
import { buildFingerprint } from './video-token';
import { isSessionValid, trackAndCheckAbuse, lockAccount, isLocked } from './rate-limit';
import { resolveAuthUser } from './auth-helper';

/**
 * تحقق شامل قبل أي وصول لفيديو:
 * 1. المستخدم مسجل دخول فعليًا (Supabase Auth session صالحة أو توكن مشفر)
 * 2. الحساب مش مقفول
 * 3. الجلسة/الجهاز مطابق للمسجل (منع تعدد الأجهزة)
 * 4. سلوك الطلبات طبيعي (مش سكريبت تحميل آلي)
 * 5. تسجيل كل طلب في سجل التدقيق
 */
export async function verifyRequest(req, { requireVideoOwnership } = {}) {
  const supabase = createServiceClient();

  // 1) استخراج مستخدم Supabase أو توكن المنصة من الـ Authorization header
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');
  if (!accessToken) return { ok: false, status: 401, error: 'مطلوب تسجيل الدخول' };

  const user = await resolveAuthUser(accessToken);
  if (!user) {
    return { ok: false, status: 401, error: 'جلسة غير صالحة' };
  }
  const userId = user.id;
  const userRole = user.role;

  // 2) الحساب مش مقفول
  const locked = await isLocked(userId);
  if (locked) return { ok: false, status: 403, error: 'الحساب موقوف مؤقتًا' };

  // 3) بصمة الجهاز
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const clientFp = req.headers.get('x-client-fp') || '';
  const fingerprint = buildFingerprint({ ip, userAgent, clientFp });

  const sessionOk = await isSessionValid(userId, fingerprint);
  if (!sessionOk) {
    return { ok: false, status: 401, error: 'الجلسة مسجلة من جهاز آخر أو منتهية' };
  }

  // 4) كشف السلوك الآلي
  const abusive = await trackAndCheckAbuse(userId);
  if (abusive) {
    await lockAccount(userId, 'طلبات فيديو مفرطة');
    await recordSecurityEvent(supabase, {
      userId,
      eventType: 'account_locked_auto',
      details: { reason: 'rate_abuse', ip, userAgent },
    });
    return { ok: false, status: 429, error: 'تم رصد نشاط غير طبيعي' };
  }

  return { ok: true, userId, userRole, fingerprint, supabase, ip, userAgent };
}

/**
 * تحقق ملكية/اشتراك: هل هذا المستخدم فعلاً مشترك في الكورس اللي فيه الفيديو ده؟
 * بيستخدم service role عشان يقدر يقرأ بغض النظر عن RLS، لكن بمنطق تحقق صريح هنا.
 */
export async function checkEnrollment(supabase, userId, videoId, userRole = 'student') {
  const { data: video, error: videoErr } = await supabase
    .from('videos')
    .select('id, course_id, storage_path, unlock_after_days')
    .eq('id', videoId)
    .single();

  if (videoErr || !video) return { enrolled: false, video: null };

  // إذا كان المستخدم هو المعلم (أدمن)، يسمح له بمعاينة أي فيديو في منصته فوراً
  if (userRole === 'admin') {
    return { enrolled: true, video };
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, enrolled_at')
    .eq('user_id', userId)
    .eq('course_id', video.course_id)
    .maybeSingle();

  if (!enrollment) return { enrolled: false, video: null };

  // فحص Drip content: هل استحق موعد فتح هذا الفيديو بعد؟
  const unlockDays = video.unlock_after_days || 0;
  if (unlockDays > 0) {
    const enrolledAt = new Date(enrollment.enrolled_at);
    const unlockDate = new Date(enrolledAt.getTime() + unlockDays * 24 * 60 * 60 * 1000);
    if (new Date() < unlockDate) {
      return { enrolled: true, video: null, locked_until: unlockDate.toISOString() };
    }
  }

  return { enrolled: true, video };
}

/**
 * التحقق من قبول اتفاقية الاستخدام - إلزامي قبل أي وصول لأي فيديو.
 */
export async function checkTosAccepted(supabase, userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('accepted_tos')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return true;
    return !!data?.accepted_tos;
  } catch (e) {
    return true;
  }
}

/**
 * فحص هل الجهاز موثوق مسبقًا (تجاوز 2FA) أم محتاج OTP.
 */
export async function isDeviceTrusted(supabase, userId, fingerprint) {
  const { data } = await supabase
    .from('trusted_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();
  return !!data;
}

/**
 * تسجيل حدث أمني + إرسال تنبيه فوري (Telegram/webhook).
 */
export async function recordSecurityEvent(supabase, { userId, eventType, details }) {
  await supabase.from('security_events').insert({
    user_id: userId,
    event_type: eventType,
    details: details || {},
  });

  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 [${eventType}] user=${userId} ${JSON.stringify(details || {})}`,
        }),
      });
    } catch (e) {
      console.error('فشل إرسال تنبيه أمني:', e.message);
    }
  }
}

export async function logAccess(supabase, { userId, videoId, ip, userAgent }) {
  await supabase.from('video_access_logs').insert({
    user_id: userId,
    video_id: videoId,
    ip_address: ip,
    user_agent: userAgent,
  });
}
