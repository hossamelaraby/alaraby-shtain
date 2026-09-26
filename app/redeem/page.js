'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RedeemPage() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleCodeChange(e) {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // تنسيق تلقائي XXXX-XXXX
    if (val.length === 4 && !val.includes('-')) {
      val = val + '-';
    }
    setCode(val);
  }

  async function handleRedeem(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('sb_access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const body = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setMessage({ type: 'error', text: body.error || 'الكود غير صحيح أو مستخدم من قبل' });
        return;
      }

      setMessage({ type: 'success', text: 'تم تفعيل الكود بنجاح! تم فتح محتوى الكورس لك فوراً 🎉' });
      setCode('');
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً' });
    }
  }

  return (
    <div className="container-narrow">
      <div className="card" style={{ textAlign: 'center', marginTop: 30, padding: 32 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎟️</div>
        <h2>تفعيل كود الاشتراك</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          أدخل كود الاشتراك المكون من 8 خانات الذي استلمته من مستر محمد العربي لتفعيل الكورس
        </p>

        {message && (
          <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ textAlign: 'right', marginBottom: 20 }}>
            <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
            <div>{message.text}</div>
          </div>
        )}

        <form onSubmit={handleRedeem}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={handleCodeChange}
              style={{
                fontSize: 24,
                textAlign: 'center',
                letterSpacing: 4,
                fontWeight: 800,
                padding: '14px 10px',
                fontFamily: 'monospace',
                borderColor: '#cbd5e1',
              }}
              maxLength={9}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || code.length < 8}
            style={{ padding: 13, fontSize: 16 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }}></span>
                جارٍ التفعيل...
              </>
            ) : (
              'تفعيل الكورس الآن 🚀'
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link href="/dashboard" className="btn btn-secondary">
            ⬅️ العودة إلى كورساتي
          </Link>
        </div>
      </div>
    </div>
  );
}
