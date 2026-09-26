'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [academicYear, setAcademicYear] = useState('الصف الثالث الثانوي');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanName || cleanName.length < 3) {
      setError('يرجى إدخال اسم الطالب ثلاثي على الأقل');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً (مثال: 01012345678)');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين، يرجى إعادة التأكد');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          phone: cleanPhone,
          academicYear,
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً');
        return;
      }

      if (data.token) {
        localStorage.setItem('sb_access_token', data.token);
        localStorage.setItem('user_email', data.user?.email || '');
        localStorage.setItem('user_role', data.user?.role || 'student');
        localStorage.setItem('user_name', data.user?.full_name || cleanName);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="auth-badge">⚛️ منصة فيزياء الثانوية العامة</div>
          <h2 className="auth-title">إنشاء حساب طالب جديد</h2>
          <p className="auth-subtitle">انضم لمنصة العربي شتاين مع مستر محمد العربي وابدأ رحلة التفوق</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSignup}>
          {/* اسم الطالب */}
          <div className="form-group">
            <label className="form-label">
              اسم الطالب بالكامل <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: أحمد محمد محمود"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* رقم الهاتف */}
          <div className="form-group">
            <label className="form-label">
              رقم الهاتف المحمول (الموبايل) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="tel"
              className="form-input"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
            <p className="form-hint">يُستخدم للدخول إلى حسابك واستلام بيانات الاشتراك</p>
          </div>

          {/* الصف الدراسي */}
          <div className="form-group">
            <label className="form-label">الصف الدراسي</label>
            <select
              className="form-input"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="الصف الثالث الثانوي">الصف الثالث الثانوي (الشهادة الثانوية العامة)</option>
              <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
              <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
            </select>
          </div>

          {/* البريد الإلكتروني (اختياري) */}
          <div className="form-group">
            <label className="form-label">
              البريد الإلكتروني <span style={{ fontSize: 12, color: '#94a3b8' }}>(اختياري)</span>
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          {/* كلمة المرور وتأكيدها */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                كلمة المرور <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                تأكيد كلمة المرور <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ padding: 14, fontSize: 16, marginTop: 8 }}
          >
            {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب وبدء الدراسة 🚀'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          لديك حساب مسجل بالفعل؟{' '}
          <Link href="/login" style={{ fontWeight: 800 }}>
            تسجيل الدخول الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
