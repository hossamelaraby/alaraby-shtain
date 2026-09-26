'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState('phone'); // 'phone' | 'admin' | 'email' | 'code'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  
  // Admin credentials state
  const [adminIdentifier, setAdminIdentifier] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'admin-required') {
      setError('هذه المنطقة مخصصة لمستر محمد العربي وإدارة المنصة فقط، يرجى تسجيل الدخول بحساب المسؤول للمتابعة.');
      setMode('admin');
    } else if (errorParam === 'session-expired') {
      setError('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.');
    }
  }, [searchParams]);

  // حفظ الجلسة والكوكيز وتوجيه المستخدم
  function handleAuthSuccess(data, defaultRedirect = '/dashboard') {
    if (data?.token) {
      localStorage.setItem('sb_access_token', data.token);
      localStorage.setItem('user_email', data.user?.email || '');
      localStorage.setItem('user_role', data.user?.role || 'student');
      localStorage.setItem('user_name', data.user?.full_name || data.user?.name || '');

      // ضبط الكوكيز لتأمين المسارات عبر السيرفر والـ Middleware
      document.cookie = `sb_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `user_role=${data.user?.role || 'student'}; path=/; max-age=2592000; SameSite=Lax`;

      const redirectParam = searchParams.get('redirect');
      const targetUrl = redirectParam || (data.user?.role === 'admin' ? '/admin' : defaultRedirect);
      window.location.href = targetUrl;
    }
  }

  // 1. تسجيل الدخول برقم الهاتف وكلمة المرور (للطلاب المسجلين)
  async function handlePhoneLogin(e) {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً (مثال: 01012345678)');
      return;
    }
    if (!password) {
      setError('يرجى كتابة كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', phone: cleanPhone, password }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || 'رقم الهاتف أو كلمة المرور غير صحيحة. إذا كنت طالباً جديداً يرجى إنشاء حساب أولاً.');
        return;
      }
      handleAuthSuccess(data, '/dashboard');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت');
    }
  }

  // 2. تسجيل دخول المسؤول (Admin) باسم المستخدم / رقم الهاتف + كلمة المرور
  async function handleAdminLogin(e) {
    e.preventDefault();
    setError('');

    const cleanIdent = adminIdentifier.trim();
    if (!cleanIdent) {
      setError('يرجى إدخال اسم المستخدم أو رقم هاتف المسؤول');
      return;
    }
    if (!adminPassword) {
      setError('يرجى إدخال كلمة مرور المسؤول');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          identifier: cleanIdent,
          password: adminPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || 'بيانات المسؤول غير صحيحة');
        return;
      }
      handleAuthSuccess(data, '/admin');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 3. تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || 'البريد أو كلمة المرور غير صحيحة');
        return;
      }
      handleAuthSuccess(data, '/dashboard');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 4. تسجيل الدخول المباشر بكود الاشتراك
  async function handleCodeLogin(e) {
    e.preventDefault();
    setError('');

    const cleanCode = studentCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('يرجى كتابة كود الاشتراك');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'code', code: cleanCode }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || 'الكود غير صحيح أو مستخدم مسبقاً');
        return;
      }
      handleAuthSuccess(data, data.redirectUrl || '/dashboard');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 5. دخول كطالب تجريبي للمعاينة المجانية
  async function handleGuestLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'guest' }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (data?.token) {
        handleAuthSuccess(data, '/dashboard');
      } else {
        setError('تعذر إتمام الدخول التجريبي');
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  return (
    <div className="auth-page" style={{ padding: '24px 16px' }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* صورة مستر محمد العربي وبيانات المنصة */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <img
              src="/mr-mohamed-alaraby.jpg"
              alt="مستر محمد العربي"
              style={{
                width: 105,
                height: 105,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #0284c7',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.45)',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                background: '#0284c7',
                color: '#fff',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                border: '2px solid #0b132b',
              }}
            >
              ⚛️
            </span>
          </div>

          <h2 className="auth-title" style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>
            منصة العربي شتاين
          </h2>
          <p style={{ color: '#38bdf8', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
            مع مستر محمد العربي — أستاذ الفيزياء
          </p>
          <p className="auth-subtitle" style={{ fontSize: 13, margin: 0, color: '#94a3b8' }}>
            تسجيل الدخول للطلاب المسجلين
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* التبويبات الأربعة المحددة: بالموبايل - الإدارة - بالإيميل - بالكود */}
        <div
          className="auth-tabs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
            marginBottom: 20,
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 4,
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            className={mode === 'phone' ? 'active' : ''}
            onClick={() => {
              setMode('phone');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            📱 بالموبايل
          </button>

          <button
            type="button"
            className={mode === 'admin' ? 'active' : ''}
            onClick={() => {
              setMode('admin');
              setError('');
            }}
            style={{
              fontSize: 13,
              padding: '9px 4px',
              color: mode === 'admin' ? '#f59e0b' : '#fbbf24',
              fontWeight: 800,
            }}
          >
            🛡️ الإدارة
          </button>

          <button
            type="button"
            className={mode === 'email' ? 'active' : ''}
            onClick={() => {
              setMode('email');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            ✉️ بالإيميل
          </button>

          <button
            type="button"
            className={mode === 'code' ? 'active' : ''}
            onClick={() => {
              setMode('code');
              setError('');
            }}
            style={{ fontSize: 13, padding: '9px 4px', fontWeight: 700 }}
          >
            🔑 بالكود
          </button>
        </div>

        {/* 1. دخول برقم الهاتف وكلمة المرور (للطلاب) */}
        {mode === 'phone' && (
          <form onSubmit={handlePhoneLogin}>
            <div className="form-group">
              <label className="form-label">رقم هاتف الطالب</label>
              <input
                type="tel"
                className="form-input"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right', fontSize: 16 }}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
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

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: 13, fontSize: 16, marginTop: 6 }}
            >
              {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول 🚀'}
            </button>
          </form>
        )}

        {/* 2. دخول المسؤول (Admin) باسم المستخدم / رقم الهاتف وكلمة المرور */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 3 }}>
                🛡️ بوابة إدارة المنصة (مستر محمد العربي)
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                الدخول مقتصر على إدارة النظام فقط باستخدام بيانات المسؤول.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">اسم المستخدم أو هاتف الأدمن</label>
              <input
                type="text"
                className="form-input"
                placeholder="admin أو 01000000000"
                value={adminIdentifier}
                onChange={(e) => setAdminIdentifier(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right', fontSize: 15 }}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة مرور الأدمن</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{
                padding: 13,
                fontSize: 16,
                marginTop: 6,
                background: '#f59e0b',
                borderColor: '#f59e0b',
                color: '#000',
                fontWeight: 800,
              }}
            >
              {loading ? 'جارٍ التحقق من صلاحيات الإدارة...' : 'تسجيل دخول المسؤول 🛡️'}
            </button>
          </form>
        )}

        {/* 3. دخول بالبريد وكلمة المرور */}
        {mode === 'email' && (
          <form onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-input"
                placeholder="student@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right' }}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
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

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: 13, fontSize: 16, marginTop: 6 }}
            >
              {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول بالبريد 🚀'}
            </button>
          </form>
        )}

        {/* 4. دخول بكود الطالب المباشر */}
        {mode === 'code' && (
          <form onSubmit={handleCodeLogin}>
            <div className="form-group">
              <label className="form-label">كود الاشتراك المستلم من المستر</label>
              <input
                type="text"
                className="form-input"
                placeholder="PHYS-2026-XXXX"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, fontWeight: 700 }}
                autoFocus
              />
              <p className="form-hint">أدخل الكود وسيتم تسجيلك وفتح الكورس الخاص بك فوراً</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: 13, fontSize: 16, marginTop: 6 }}
            >
              {loading ? 'جارٍ تفعيل الكود والدخول...' : 'دخول بكود الاشتراك 🔑'}
            </button>
          </form>
        )}

        {/* زر التصفح التجريبي فقط */}
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleGuestLogin}
            disabled={loading}
            style={{
              padding: '11px',
              fontSize: 13,
              background: 'rgba(2, 132, 199, 0.08)',
              color: '#38bdf8',
              borderColor: '#0284c7',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 8,
            }}
          >
            🎓 تصفح كطالب تجريبي (معاينة مجانية للمنصة)
          </button>
        </div>

        {/* رابط إنشاء حساب طالب جديد */}
        <div className="auth-footer" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          ليس لديك حساب بعد؟{' '}
          <Link href="/signup" style={{ fontWeight: 800, color: '#38bdf8', textDecoration: 'underline' }}>
            إنشاء حساب طالب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
