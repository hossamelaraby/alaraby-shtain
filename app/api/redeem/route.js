import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { recordSecurityEvent } from '@/lib/video-guard';
import { resolveAuthUser } from '@/lib/auth-helper';

export async function POST(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');

  const user = await resolveAuthUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول أولاً' }, { status: 401 });
  }
  const userId = user.id;

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'الكود مطلوب' }, { status: 400 });
  }

  // توحيد صيغة الكود (حروف كبيرة، بدون مسافات) قبل البحث
  const normalizedCode = code.trim().toUpperCase();

  const { data: codeRow, error: codeError } = await supabase
    .from('enrollment_codes')
    .select('id, course_id, used_by, expires_at')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (codeError || !codeRow) {
    return NextResponse.json({ error: 'الكود غير صحيح' }, { status: 404 });
  }

  if (codeRow.used_by) {
    return NextResponse.json({ error: 'هذا الكود تم استخدامه من قبل' }, { status: 409 });
  }

  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'هذا الكود منتهي الصلاحية' }, { status: 410 });
  }

  // تحقق: هل الطالب مشترك في نفس الكورس أصلاً؟
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', codeRow.course_id)
    .maybeSingle();

  if (existingEnrollment) {
    return NextResponse.json({ error: 'أنت مشترك بالفعل في هذا الكورس' }, { status: 409 });
  }

  // تنفيذ العملية: تسجيل الكود كمستخدم + إنشاء الاشتراك
  // (لو حصل خطأ في أي خطوة، لازم تتأكد من عدم ترك حالة غير متسقة - هنا نرتب العمليات بحرص)
  const { error: markUsedError } = await supabase
    .from('enrollment_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', codeRow.id)
    .is('used_by', null); // شرط إضافي يمنع سباق التنفيذ (race condition) لو حصلت محاولتين في نفس اللحظة

  if (markUsedError) {
    return NextResponse.json({ error: 'حصل خطأ أثناء تفعيل الكود' }, { status: 500 });
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .insert({ user_id: userId, course_id: codeRow.course_id })
    .select()
    .single();

  if (enrollError) {
    // فشل إنشاء الاشتراك بعد ما اتعلّم الكود كمستخدم - نرجّع الكود متاح تاني بدل ما نضيّعه
    await supabase.from('enrollment_codes').update({ used_by: null, used_at: null }).eq('id', codeRow.id);
    return NextResponse.json({ error: 'حصل خطأ أثناء تفعيل الاشتراك' }, { status: 500 });
  }

  await recordSecurityEvent(supabase, {
    userId,
    eventType: 'code_redeemed',
    details: { course_id: codeRow.course_id },
  });

  return NextResponse.json({ success: true, course_id: codeRow.course_id });
}
