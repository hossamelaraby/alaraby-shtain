'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (signupError) {
        const msg = signupError.message || '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
          setError('هذا البريد الإلكتروني مسجل بالفعل في منصة العربي شتاين - جرّب تسجيل الدخول.');
        } else if (msg.toLowerCase().includes('invalid')) {
          setError('صيغة البريد الإلكتروني غير صحيحة أو غير مقبولة.');
        } else {
          setError(signupError.message || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً.');
        }
        return;
      }

      // إذا كانت الجلسة متاحة فوراً (بدون اشتراط تأكيد الإيميل)
      if (data?.session) {
        localStorage.setItem('sb_access_token', data.session.access_token);
        localStorage.setItem('user_email', email);
        window.location.href = '/redeem';
      } else {
        // تأكيد البريد مطلوب من إعدادات Supabase
        setSuccess(true);
      }
    } catch (err) {
      setLoading(false);
      setError('تعذر الاتصال بالخادم، تأكد من اتصال الإنترنت وحاول مجدداً.');
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🎉</div>
          <div className="auth-badge">تم إنشاء الحساب بنجاح</div>
          <h2 className="auth-title">أهلاً بك في العربي شتاين!</h2>
          <div className="alert alert-info" style={{ textAlign: 'right', marginTop: 16 }}>
            <div>
              <strong>تأكيد البريد الإلكتروني:</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                تم إرسال رابط تأكيد إلى بريدك الإلكتروني <strong>{email}</strong>. يرجى الضغط على الرابط في رسالتك لتفعيل الحساب، ثم سجل دخولك للمنصة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const res = await fetch('/api/auth/instant-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'google', email }),
              });
              const d = await res.json().catch(() => ({}));
              if (d?.token) {
                localStorage.setItem('sb_access_token', d.token);
                localStorage.setItem('user_email', email);
                window.location.href = '/dashboard';
              }
            }}
            className="btn btn-primary btn-block"
            style={{ marginTop: 20, padding: 12 }}
          >
            🚀 الدخول الفوري للمنصة الآن (تخطي التأكيد)
          </button>
          <Link href="/login" className="btn btn-secondary btn-block" style={{ marginTop: 8, padding: 10 }}>
            الذهاب لصفحة تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
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
            <label className="form-label">كلمة المرور (8 أحرف على الأقل)</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }}></span>
                جارٍ إنشاء الحساب...
              </>
            ) : (
              'إنشاء الحساب الآن 🚀'
            )}
          </button>
        </form>

        <div className="auth-footer">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" style={{ fontWeight: 800 }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
