import { NextResponse } from 'next/server';
import { loginWithPhone, loginAsAdmin, loginAsGuest, stringToUuid, issueAuthToken, verifyPassword } from '@/lib/auth-service';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, phone, email, password, code } = body;

    // 1. تسجيل الدخول كمسؤول (Admin) - اسم مستخدم / هاتف + كلمة مرور
    if (type === 'admin') {
      const result = await loginAsAdmin({
        username: body.username,
        phone: body.phone,
        identifier: body.identifier || body.username || body.phone,
        password: body.password,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      const res = NextResponse.json(result);
      res.cookies.set('sb_token', result.token, { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      res.cookies.set('user_role', result.user.role, { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      return res;
    }

    // 2. تسجيل الدخول كطالب تجريبي (معاينة مجانية)
    if (type === 'guest') {
      const result = await loginAsGuest();
      const res = NextResponse.json(result);
      res.cookies.set('sb_token', result.token, { path: '/', maxAge: 86400, sameSite: 'lax' });
      res.cookies.set('user_role', result.user.role, { path: '/', maxAge: 86400, sameSite: 'lax' });
      return res;
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
      const res = NextResponse.json(result);
      res.cookies.set('sb_token', result.token, { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      res.cookies.set('user_role', result.user.role, { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      return res;
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

    // 5. تسجيل الدخول بكود الطالب مع التفعيل الفوري التلقائي للكورس
    if (type === 'code' && code) {
      const cleanCode = code.trim().toUpperCase();
      const supabase = createServiceClient();
      const { data: codeRow, error: codeErr } = await supabase
        .from('enrollment_codes')
        .select('id, course_id, used_by, expires_at')
        .eq('code', cleanCode)
        .maybeSingle();

      if (codeErr || !codeRow) {
        return NextResponse.json({ error: 'كود الطالب غير صحيح، يرجى التأكد من كتابة الكود بشكل سليم' }, { status: 404 });
      }

      if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
        return NextResponse.json({ error: 'هذا الكود منتهي الصلاحية' }, { status: 410 });
      }

      let userId;
      let studentName = `طالب (${cleanCode})`;
      let studentEmail = `${cleanCode}@student.alaraby-shtain.com`;

      if (codeRow.used_by) {
        userId = codeRow.used_by;
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .maybeSingle();

        if (existingProf) {
          studentName = existingProf.full_name || studentName;
          studentEmail = existingProf.email || studentEmail;
        }
      } else {
        userId = stringToUuid(`student_code_${cleanCode}`);

        // إنشاء حساب الطالب في profiles
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: studentName,
          email: studentEmail,
          phone: cleanCode,
          role: 'student',
          accepted_tos: true,
          is_blocked: false,
        });

        // تسجيل الكود كمستخدم لهذا الطالب
        await supabase.from('enrollment_codes').update({
          used_by: userId,
          used_at: new Date().toISOString(),
        }).eq('id', codeRow.id);
      }

      // تفعيل اشتراك الطالب في الكورس فورياً ودون أي خطوات إضافية
      await supabase.from('enrollments').upsert({
        user_id: userId,
        course_id: codeRow.course_id,
      });

      const user = {
        id: userId,
        email: studentEmail,
        full_name: studentName,
        role: 'student',
      };

      const token = issueAuthToken(user);
      const res = NextResponse.json({
        success: true,
        user,
        token,
        course_id: codeRow.course_id,
        redirectUrl: '/dashboard',
      });

      res.cookies.set('sb_token', token, { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      res.cookies.set('user_role', 'student', { path: '/', maxAge: 30 * 86400, sameSite: 'lax' });
      return res;
    }

    return NextResponse.json({ error: 'طريقة الدخول غير محددة أو غير مدعومة' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في معالجة طلب الدخول' }, { status: 500 });
  }
}
