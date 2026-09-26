'use client';
import { useState } from 'react';

export default function DeviceVerifyGate({ clientFp, onVerified }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sb_access_token');

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Client-FP': clientFp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code.trim() }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'كود التحقق غير صحيح أو انتهت صلاحيته');
      return;
    }
    onVerified();
  }

  return (
    <div className="container-narrow">
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
        <span className="badge badge-warning" style={{ marginBottom: 10 }}>التحقق الأمني من الجهاز</span>
        <h2>تسجيل دخول من جهاز جديد</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
          لحماية حسابك ومحتوى الكورس، أرسلنا كود تحقق مكوّن من 6 أرقام إلى بريدك الإلكتروني
        </p>

        {error && (
          <div className="alert alert-danger" style={{ textAlign: 'right', marginBottom: 16 }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: 700 }}
              maxLength={6}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12 }}>
            {loading ? 'جارٍ التحقق...' : 'تأكيد الجهاز ومتابعة المشاهدة 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
