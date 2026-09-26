'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState('phone'); // 'phone' | 'email' | 'google' | 'code'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  
  // Admin password modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth-callback-failed') {
      setError('تعذر إكمال المصادقة التلقائية، يرجى المحاولة مرة أخرى.');
    }
  }, [searchParams]);

  // حفظ الجلسة وتوجيه المستخدم
  function handleAuthSuccess(data, redirectUrl = '/dashboard') {
    if (data?.token) {
      localStorage.setItem('sb_access_token', data.token);
      localStorage.setItem('user_email', data.user?.email || '');
      localStorage.setItem('user_role', data.user?.role || 'student');
      localStorage.setItem('user_name', data.user?.full_name || data.user?.name || '');
      window.location.href = redirectUrl;
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

  // 2. تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
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
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    }
  }

  // 3. دخول بحساب جوجل (Gmail)
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

  // 4. دخول بكود الطالب
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
      handleAuthSuccess(data, '/dashboard');
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم');
    }
  }

  // 5. تسجيل دخول المسؤول (Admin) مع التحقق من كلمة المرور
  async function handleAdminSubmit(e) {
    e.preventDefault();
    setAdminError('');
    if (!adminPassword) {
      setAdminError('يرجى إدخال كلمة مرور المسؤول');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'admin', password: adminPassword }),
      });
      const data = await res.json().catch(() => ({}));
      setAdminLoading(false);

      if (!res.ok || data.error) {
        setAdminError(data.error || 'كلمة مرور المسؤول غير صحيحة');
        return;
      }
      setShowAdminModal(false);
      handleAuthSuccess(data, '/admin');
    } catch (err) {
      setAdminLoading(false);
      setAdminError('تعذر الاتصال بالخادم');
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
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="auth-badge">⚛️ منصة فيزياء الثانوية العامة</div>
          <h2 className="auth-title">تسجيل الدخول للمنصة</h2>
          <p className="auth-subtitle">مرحباً بك في منصة العربي شتاين مع مستر محمد العربي</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div style={{ flex: 1 }}>{error}</div>
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
          <span>أو اختر طريقة تسجيل الدخول</span>
        </div>

        {/* تبويبات طرق الدخول */}
        <div className="auth-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          <button
            type="button"
            className={mode === 'phone' ? 'active' : ''}
            onClick={() => {
              setMode('phone');
              setError('');
            }}
            style={{ fontSize: 13, padding: '8px 4px' }}
          >
            📱 بالموبايل
          </button>
          <button
            type="button"
            className={mode === 'email' ? 'active' : ''}
            onClick={() => {
              setMode('email');
              setError('');
            }}
            style={{ fontSize: 13, padding: '8px 4px' }}
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
            style={{ fontSize: 13, padding: '8px 4px' }}
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
            style={{ fontSize: 13, padding: '8px 4px' }}
          >
            🔑 بالكود
          </button>
        </div>

        {/* 1. دخول برقم الهاتف وكلمة المرور (المطلوب الأساسي) */}
        {mode === 'phone' && (
          <form onSubmit={handlePhoneLogin}>
            <div className="form-group">
              <label className="form-label">رقم الهاتف المحمول</label>
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

        {/* 2. دخول بالبريد وكلمة المرور */}
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

        {/* 3. دخول بجوجل (Gmail) المباشر الأنيق */}
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

        {/* 4. دخول بكود الطالب */}
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

        {/* صندوق الوصول السريع المنضبط والمحمي */}
        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 12,
            background: 'rgba(2, 132, 199, 0.06)',
            border: '1px dashed #0284c7',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 10, textAlign: 'center' }}>
            ⚡ وصول سريع للمعاينة والإدارة
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAdminError('');
                setAdminPassword('');
                setShowAdminModal(true);
              }}
              disabled={loading}
              style={{
                fontSize: 12,
                padding: '10px 8px',
                background: '#0f172a',
                color: '#f59e0b',
                borderColor: '#f59e0b',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              🛡️ دخول المسؤول (Admin)
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

      {/* نافذة التحقق من كلمة مرور المسؤول (Admin Protection Modal) */}
      {showAdminModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="auth-card"
            style={{
              maxWidth: 400,
              width: '100%',
              margin: 0,
              border: '1px solid #f59e0b',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
              <h3 style={{ color: '#fff', fontSize: 18, margin: 0 }}>دخول إدارة المنصة (Admin)</h3>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                هذه الصفحة مخصصة لمستر محمد العربي وإدارة النظام فقط
              </p>
            </div>

            {adminError && (
              <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                <span>⚠️</span>
                <div style={{ fontSize: 13 }}>{adminError}</div>
              </div>
            )}

            <form onSubmit={handleAdminSubmit}>
              <div className="form-group">
                <label className="form-label">كلمة مرور المسؤول (Admin Password)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  autoFocus
                  dir="ltr"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adminLoading}
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 800 }}
                >
                  {adminLoading ? 'جارٍ التحقق...' : 'دخول الإدارة 🚀'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdminModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
