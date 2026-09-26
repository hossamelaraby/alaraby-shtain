import { NextResponse } from 'next/server';
import { registerStudent } from '@/lib/auth-service';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, phone, email, password, confirmPassword, academicYear } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'اسم الطالب مطلوب' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل' }, { status: 400 });
    }
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'كلمتا المرور غير متطابقتين' }, { status: 400 });
    }

    const result = await registerStudent({ fullName, phone, email, password, academicYear });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في السيرفر أثناء تسجيل الحساب' }, { status: 500 });
  }
}
