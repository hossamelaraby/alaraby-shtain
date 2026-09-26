'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [signupMode, setSignupMode] = useState('phone'); // 'phone' | 'email' | 'code'

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('الصف الثالث الثانوي');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 3) {
      setError('يرجى إدخال اسم الطالب ثلاثي على الأقل');
      return;
    }

    if (signupMode === 'phone') {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً (مثال: 01012345678)');
        return;
      }
    }

    if (signupMode === 'email') {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('يرجى إدخال بريد إلكتروني صحيح');
        return;
      }
    }

    if (signupMode === 'code') {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        setError('يرجى إدخال كود الاشتراك المطبوع على الكارت');
        return;
      }
    }

    if (signupMode !== 'code') {
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين، يرجى إعادة التأكد');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          phone: phone.trim().replace(/[^0-9]/g, ''),
          email: email.trim(),
          code: code.trim().toUpperCase(),
          academicYear,
          password,
          confirmPassword,
          signupType: signupMode,
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
        window.location.href = data.redirectUrl || '/dashboard';
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً');
    }
  }

  return (
    <div className="auth-page" style={{ padding: '24px 16px' }}>
      <div className="auth-card" style={{ maxWidth: 510 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="auth-badge">⚛️ منصة فيزياء الثانوية العامة</div>
          <h2 className="auth-title" style={{ fontSize: 22, margin: '0 0 6px', fontWeight: 800 }}>
            إنشاء حساب طالب جديد
          </h2>
          <p className="auth-subtitle" style={{ fontSize: 13, margin: 0, color: '#94a3b8' }}>
            انضم لمنصة العربي شتاين مع مستر محمد العربي واختر الطريقة الأنسب لك
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* تبويبات طرق إنشاء الحساب */}
        <div
          className="auth-tabs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
            marginBottom: 20,
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 4,
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            className={signupMode === 'phone' ? 'active' : ''}
            onClick={() => {
              setSignupMode('phone');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            📱 بالموبايل
          </button>

          <button
            type="button"
            className={signupMode === 'email' ? 'active' : ''}
            onClick={() => {
              setSignupMode('email');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            ✉️ بالإيميل
          </button>

          <button
            type="button"
            className={signupMode === 'code' ? 'active' : ''}
            onClick={() => {
              setSignupMode('code');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            🔑 بكود الكارت
          </button>
        </div>

        <form onSubmit={handleSignup}>
          {/* اسم الطالب بالكامل */}
          <div className="form-group">
            <label className="form-label">
              اسم الطالب ثلاثي بالكامل <span style={{ color: '#ef4444' }}>*</span>
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

          {/* طريقة 1: الموبايل */}
          {signupMode === 'phone' && (
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
                style={{ textAlign: 'right', fontSize: 16 }}
              />
              <p className="form-hint">يُستخدم للدخول إلى حسابك واستلام بيانات الاشتراك</p>
            </div>
          )}

          {/* طريقة 2: الإيميل */}
          {signupMode === 'email' && (
            <div className="form-group">
              <label className="form-label">
                البريد الإلكتروني <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
              <p className="form-hint">ستصلك عليه إشعارات المنصة وتأكيد الحساب</p>
            </div>
          )}

          {/* طريقة 3: كود الكارت المباشر */}
          {signupMode === 'code' && (
            <div>
              <div className="form-group">
                <label className="form-label">
                  كود الاشتراك المطبوع على الكارت <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="PHYS-2026-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, fontWeight: 700 }}
                />
                <p className="form-hint">سيتم إنشاء حسابك وتفعيل الكورس الخاص بالكود فورياً بنقرة واحدة</p>
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف (اختياري لربط الكارت بهاتفك)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>
          )}

          {/* كلمة المرور وتأكيدها (إذا لم تكن تسجيلاً سريعاً بالكود) */}
          {signupMode !== 'code' && (
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
          )}

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
          <Link href="/login" style={{ fontWeight: 800, color: '#38bdf8' }}>
            تسجيل الدخول الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
