'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState('phone'); // 'phone' | 'admin' | 'email' | 'google' | 'code'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  
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
    } else if (errorParam === 'auth-callback-failed') {
      setError('تعذر إكمال المصادقة، يرجى المحاولة مرة أخرى.');
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

  // 1. تسجيل الدخول برقم الهاتف وكلمة المرور
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
        setError(data.error || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
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
        setError(data.error || 'اسم المستخدم أو كلمة المرور للمسؤول غير صحيحة');
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

  // 4. دخول بحساب جوجل (Gmail) المباشر
  async function handleGoogleLogin(e) {
    e.preventDefault();
    setError('');

    if (!googleEmail.trim() || !googleEmail.includes('@')) {
      setError('يرجى إدخال بريد جوجل صالح (مثال: student@gmail.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/instant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'google', email: googleEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (data?.token) {
        handleAuthSuccess(data, '/dashboard');
      } else {
        setError(data.error || 'تعذر الدخول، يرجى المحاولة مرة أخرى');
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 5. دخول بكود الطالب
  async function handleCodeLogin(e) {
    e.preventDefault();
    setError('');
    const cleanCode = studentCode.trim().toUpperCase();

    if (!cleanCode) {
      setError('يرجى إدخال كود الطالب أو الكارت');
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
        setError(data.error || 'الكود غير صحيح أو منتهي الصلاحية');
        return;
      }
      handleAuthSuccess(data, data.redirectUrl || '/dashboard');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 6. دخول كطالب تجريبي للمعاينة
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
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 490 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="auth-badge">⚛️ منصة فيزياء الثانوية العامة</div>
          <h2 className="auth-title">تسجيل الدخول للمنصة</h2>
          <p className="auth-subtitle">مرحباً بك في منصة العربي شتاين مع مستر محمد العربي</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* زر جوجل التفاعلي المباشر */}
        <button
          type="button"
          className="btn-google"
          onClick={() => {
            setMode('google');
            setError('');
          }}
          disabled={loading}
          style={{ marginBottom: 16 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35.1 26.8 36 24 36c-5.3 0-9.6-3.4-11.3-8H6.1v5.6C9.4 39.7 16.1 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.3 5.3C41.4 35.1 44 29.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          الدخول السريع بحساب Google
        </button>

        <div className="auth-divider">
          <span>أو اختر حساب الدخول</span>
        </div>

        {/* تبويبات طرق الدخول متضمنة تبويب الإدارة الرسمي */}
        <div className="auth-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, marginBottom: 18 }}>
          <button
            type="button"
            className={mode === 'phone' ? 'active' : ''}
            onClick={() => {
              setMode('phone');
              setError('');
            }}
            style={{ fontSize: 12, padding: '8px 2px' }}
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
              fontSize: 12,
              padding: '8px 2px',
              color: mode === 'admin' ? '#f59e0b' : '#fbbf24',
              fontWeight: 700,
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
            style={{ fontSize: 12, padding: '8px 2px' }}
          >
            ✉️ بالإيميل
          </button>

          <button
            type="button"
            className={mode === 'google' ? 'active' : ''}
            onClick={() => {
              setMode('google');
              setError('');
            }}
            style={{ fontSize: 12, padding: '8px 2px' }}
          >
            🌐 بجوجل
          </button>

          <button
            type="button"
            className={mode === 'code' ? 'active' : ''}
            onClick={() => {
              setMode('code');
              setError('');
            }}
            style={{ fontSize: 12, padding: '8px 2px' }}
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
              style={{ padding: 13, fontSize: 16, marginTop: 4 }}
            >
              {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول برقم الموبايل 🚀'}
            </button>
          </form>
        )}

        {/* 2. دخول المسؤول (Admin) باسم المستخدم / رقم الهاتف وكلمة المرور */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                🛡️ بوابة إدارة النظام (مستر محمد العربي)
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                أدخل اسم المستخدم أو رقم هاتف الأدمن مع كلمة المرور الخاصة بالإدارة.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">اسم المستخدم أو رقم هاتف الأدمن</label>
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
              {loading ? 'جارٍ التحقق من صلاحيات الإدارة...' : 'تسجيل دخول المسؤول (Admin) 🛡️'}
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
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right' }}
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
              style={{ padding: 13, fontSize: 16, marginTop: 4 }}
            >
              {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول بالإيميل 🚀'}
            </button>
          </form>
        )}

        {/* 4. دخول بجوجل (Gmail) المباشر */}
        {mode === 'google' && (
          <form onSubmit={handleGoogleLogin}>
            <div className="form-group">
              <label className="form-label">بريد حساب جوجل (Gmail)</label>
              <input
                type="email"
                className="form-input"
                placeholder="yourname@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right', fontSize: 15 }}
                autoFocus
              />
              <p className="form-hint">دخول فوري ومباشر بهوية حساب جوجل الخاص بك</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: 13, fontSize: 16, marginTop: 4 }}
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'دخول بحساب Google 🌐'}
            </button>
          </form>
        )}

        {/* 5. دخول بكود الطالب */}
        {mode === 'code' && (
          <form onSubmit={handleCodeLogin}>
            <div className="form-group">
              <label className="form-label">كود الطالب أو كود الكارت</label>
              <input
                type="text"
                className="form-input"
                placeholder="PHYS-2026 أو 1025"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                autoFocus
              />
              <p className="form-hint">أدخل الكود المستلم من مستر محمد العربي للمتابعة الفورية</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: 13, fontSize: 16, marginTop: 4 }}
            >
              {loading ? 'جارٍ التحقق من الكود...' : 'دخول بكود الطالب 🔑'}
            </button>
          </form>
        )}

        {/* أزرار الوصول المباشر أسفل البطاقة */}
        <div
          style={{
            marginTop: 22,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(2, 132, 199, 0.06)',
            border: '1px dashed #0284c7',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMode('admin');
                setError('');
              }}
              style={{
                fontSize: 12,
                padding: '10px 8px',
                background: mode === 'admin' ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                color: '#f59e0b',
                borderColor: '#f59e0b',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              🛡️ حساب الإدارة (Admin)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGuestLogin}
              disabled={loading}
              style={{
                fontSize: 12,
                padding: '10px 8px',
                background: '#0f172a',
                color: '#38bdf8',
                borderColor: '#0284c7',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              🎓 تصفح كطالب تجريبي
            </button>
          </div>
        </div>

        <div className="auth-footer" style={{ marginTop: 18 }}>
          ليس لديك حساب بعد؟{' '}
          <Link href="/signup" style={{ fontWeight: 800 }}>
            إنشاء حساب طالب جديد برقم الموبايل
          </Link>
        </div>
      </div>
    </div>
  );
}
