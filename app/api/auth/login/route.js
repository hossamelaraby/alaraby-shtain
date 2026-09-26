import { NextResponse } from 'next/server';
import { loginWithPhone, loginAsAdmin, loginAsGuest, stringToUuid, issueAuthToken, verifyPassword } from '@/lib/auth-service';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, phone, email, password, code } = body;

    // 1. تسجيل الدخول كمسؤول (Admin) - يتطلب كلمة مرور الأدمن
    if (type === 'admin') {
      const result = await loginAsAdmin({ password });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      return NextResponse.json(result);
    }

    // 2. تسجيل الدخول كطالب تجريبي (معاينة مجانية)
    if (type === 'guest') {
      const result = await loginAsGuest();
      return NextResponse.json(result);
    }

    // 3. تسجيل الدخول برقم الهاتف وكلمة المرور
    if (type === 'phone' || (!type && phone)) {
      if (!password) {
        return NextResponse.json({ error: 'كلمة المرور مطلوبة لتسجيل الدخول برقم الهاتف' }, { status: 400 });
      }
      const result = await loginWithPhone({ phone, password });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      return NextResponse.json(result);
    }

    // 4. تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
    if (type === 'email' || (!type && email)) {
      if (!email || !password) {
        return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 });
      }

      const supabase = createServiceClient();

      // البحث أولاً في profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profile && profile.password_hash) {
        if (profile.is_blocked) {
          return NextResponse.json({ error: 'هذا الحساب موقوف، يرجى التواصل مع الإدارة' }, { status: 403 });
        }
        const match = verifyPassword(password, profile.password_hash);
        if (!match) {
          return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
        }
        const token = issueAuthToken(profile);
        return NextResponse.json({ success: true, user: profile, token });
      }

      // محاولة عبر Supabase Auth إن لم يكن في profiles
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData?.user) {
        return NextResponse.json({ error: 'بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً' }, { status: 401 });
      }

      const user = {
        id: authData.user.id,
        email: authData.user.email,
        role: profile?.role || 'student',
        full_name: profile?.full_name || authData.user.email.split('@')[0],
      };
      const token = issueAuthToken(user);
      return NextResponse.json({ success: true, user, token });
    }

    // 5. تسجيل الدخول بكود الطالب
    if (type === 'code' && code) {
      const cleanCode = code.trim().toUpperCase();
      const supabase = createServiceClient();
      const { data: codeRow } = await supabase
        .from('enrollment_codes')
        .select('id, course_id, used_by')
        .eq('code', cleanCode)
        .maybeSingle();

      const user = {
        id: stringToUuid(`code_${cleanCode}`),
        email: `${cleanCode}@student.alaraby-shtain.com`,
        full_name: `طالب (${cleanCode})`,
        role: 'student',
      };
      const token = issueAuthToken(user);
      return NextResponse.json({ success: true, user, token, codeFound: !!codeRow });
    }

    return NextResponse.json({ error: 'طريقة الدخول غير محددة أو غير مدعومة' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في معالجة طلب الدخول' }, { status: 500 });
  }
}
