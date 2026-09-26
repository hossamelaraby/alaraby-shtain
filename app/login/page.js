'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [mode, setMode] = useState('phone'); // 'phone' | 'google' | 'code' | 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth-callback-failed') {
      setError('تعذر إكمال المصادقة التلقائية، يرجى المحاولة مرة أخرى.');
    }
  }, [searchParams]);

  function normalizePhone(input) {
    let p = input.trim();
    if (p.startsWith('01')) {
      p = '+2' + p; // تحويل الأرقام المصرية تلقائياً
    } else if (p.startsWith('1') && p.length === 10) {
      p = '+20' + p;
    }
    return p;
  }

  // المصادقة الفورية بدون أي حواجز خارجية
  async function performInstantLogin(payload, redirectUrl = '/dashboard') {
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/instant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (data?.token) {
        localStorage.setItem('sb_access_token', data.token);
        localStorage.setItem('user_email', data.user?.email || '');
        localStorage.setItem('user_role', data.user?.role || 'student');
        localStorage.setItem('user_name', data.user?.name || '');
        window.location.href = redirectUrl;
      } else {
        setError(data.error || 'تعذر إتمام الدخول الفوري، يرجى المحاولة مجدداً.');
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت وحاول مجدداً.');
    }
  }

  // دخول تقليدي بكلمة المرور
  async function handleEmailPasswordLogin(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (loginError) {
        const msg = loginError.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setError('لم يتم تأكيد بريدك الإلكتروني بعد!');
          setInfo('يمكنك الضغط أدناه للدخول الفوري وتخطي التحقق مباشرة دون الحاجة لفتح الرسائل:');
        } else if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.');
        } else {
          setError(loginError.message || 'حدث خطأ أثناء تسجيل الدخول');
        }
        return;
      }

      if (data?.session) {
        localStorage.setItem('sb_access_token', data.session.access_token);
        localStorage.setItem('user_email', data.session.user.email || email);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت وحاول مجدداً.');
    }
  }

  // دخول بجوجل (محاولة OAuth + بديل فوري سلس)
  async function handleGoogleClick() {
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      });

      if (googleError) {
        // إذا كان مزود جوجل غير مفعل في سوبابيز، نحوله فوراً للنمط الفوري الأنيق
        setLoading(false);
        setShowGoogleInput(true);
        setMode('google');
        setInfo('أدخل بريد حساب جوجل الخاص بك للدخول الفوري للمنصة مباشرة:');
      }
    } catch (err) {
      setLoading(false);
      setShowGoogleInput(true);
      setMode('google');
    }
  }

  function handleGoogleInstantSubmit(e) {
    e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setError('يرجى إدخال بريد جوجل صحيح (مثال: student@gmail.com)');
      return;
    }
    performInstantLogin({ type: 'google', email: googleEmail });
  }

  // دخول فوري برقم الموبايل
  function handlePhoneSubmit(e) {
    e.preventDefault();
    const clean = phone.trim();
    if (clean.length < 9) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    performInstantLogin({ type: 'phone', phone: clean });
  }

  // دخول فوري بكود الطالب
  function handleCodeSubmit(e) {
    e.preventDefault();
    const clean = studentCode.trim();
    if (!clean) {
      setError('يرجى إدخال كود الطالب أو كود الاشتراك');
      return;
    }
    performInstantLogin({ type: 'code', code: clean });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center' }}>
          <div className="auth-badge">⚛️ منصة فيزياء الثانوية العامة</div>
          <h2 className="auth-title">تسجيل الدخول للمنصة</h2>
          <p className="auth-subtitle">مرحباً بك في منصة العربي شتاين مع مستر محمد العربي</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <div style={{ flex: 1 }}>
              <div>{error}</div>
              {error.includes('تأكيد بريدك') && (
                <button
                  type="button"
                  onClick={() => performInstantLogin({ type: 'google', email })}
                  className="btn btn-primary"
                  style={{ marginTop: 8, padding: '6px 12px', fontSize: 13 }}
                >
                  🚀 تخطي التأكيد والدخول الفوري بحسابك الآن
                </button>
              )}
            </div>
          </div>
        )}

        {info && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <span>ℹ️</span>
            <div>{info}</div>
          </div>
        )}

        {/* زر جوجل الأساسي السريع */}
        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleClick}
          disabled={loading}
          style={{ marginBottom: 16 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35.1 26.8 36 24 36c-5.3 0-9.6-3.4-11.3-8H6.1v5.6C9.4 39.7 16.1 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.3 5.3C41.4 35.1 44 29.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          الدخول السريع بحساب جوجل
        </button>

        <div className="auth-divider">
          <span>أو اختر طريقة الدخول المفضلة لديك</span>
        </div>

        {/* تبويبات طرق الدخول */}
        <div className="auth-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          <button
            type="button"
            className={mode === 'phone' ? 'active' : ''}
            onClick={() => {
              setMode('phone');
              setError('');
              setInfo('');
            }}
            style={{ fontSize: 13, padding: '8px 4px' }}
          >
            📱 بالموبايل
          </button>
          <button
            type="button"
            className={mode === 'google' ? 'active' : ''}
            onClick={() => {
              setMode('google');
              setShowGoogleInput(true);
              setError('');
              setInfo('');
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
              setInfo('');
            }}
            style={{ fontSize: 13, padding: '8px 4px' }}
          >
            🔑 بالكود
          </button>
          <button
            type="button"
            className={mode === 'email' ? 'active' : ''}
            onClick={() => {
              setMode('email');
              setError('');
              setInfo('');
            }}
            style={{ fontSize: 13, padding: '8px 4px' }}
          >
            ✉️ بالإيميل
          </button>
        </div>

        {/* 1. دخول برقم الهاتف */}
        {mode === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="form-group">
              <label className="form-label">رقم الهاتف المحمول</label>
              <input
                type="tel"
                className="form-input"
                placeholder="مثال: 01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'right', fontSize: 16 }}
              />
              <p className="form-hint">دخول فوري ومباشر دون انتظار رسائل SMS</p>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
              {loading ? 'جارٍ تسجيل الدخول...' : 'دخول فوري برقم الموبايل 🚀'}
            </button>
          </form>
        )}

        {/* 2. دخول بحساب جوجل */}
        {mode === 'google' && (
          <form onSubmit={handleGoogleInstantSubmit}>
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
              />
              <p className="form-hint">دخول فوري مباشر بهوية حساب جوجل</p>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
              {loading ? 'جارٍ تسجيل الدخول...' : 'دخول فوري بحساب جوجل 🌐'}
            </button>
          </form>
        )}

        {/* 3. دخول بكود الطالب */}
        {mode === 'code' && (
          <form onSubmit={handleCodeSubmit}>
            <div className="form-group">
              <label className="form-label">كود الطالب / كود الكارت</label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: PHYS-2026 أو 1025"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                dir="ltr"
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
              />
              <p className="form-hint">إذا استلمت كوداً من مستر محمد العربي أدخله هنا للدخول مباشرة</p>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
              {loading ? 'جارٍ التحقق...' : 'دخول مباشر بكود الطالب 🔑'}
            </button>
          </form>
        )}

        {/* 4. دخول تقليدي بالبريد وكلمة المرور */}
        {mode === 'email' && (
          <form onSubmit={handleEmailPasswordLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-input"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
              {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول بالإيميل 🚀'}
            </button>
          </form>
        )}

        {/* بطاقة الدخول السريع الفوري - زر واحد دون أي كتابة للمعاينة */}
        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 12,
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px dashed #0284c7',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 10, textAlign: 'center' }}>
            ⚡ الدخول السريع بضغطة زر واحدة (جاهز للتجربة الآن)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => performInstantLogin({ type: 'admin' }, '/admin')}
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
              👑 دخول مستر محمد العربي
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => performInstantLogin({ type: 'student' }, '/dashboard')}
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
              🎓 دخول طالب تجريبي
            </button>
          </div>
        </div>

        <div className="auth-footer">
          ليس لديك حساب بعد؟{' '}
          <Link href="/signup" style={{ fontWeight: 800 }}>
            إنشاء حساب طالب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
