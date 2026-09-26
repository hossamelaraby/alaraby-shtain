'use client';
import { useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const { ok, body: resBody } = await adminFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });

    setLoading(false);

    if (!ok) {
      setMessage({ type: 'error', text: resBody.error || 'تعذر نشر الإعلان' });
      return;
    }

    setMessage({ type: 'success', text: 'تم نشر الإعلان بنجاح وسيظهر لجميع الطلاب أعلى شاشاتهم فوراً 📢' });
    setTitle('');
    setBody('');
  }

  return (
    <div className="container-narrow">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>📢 نشر إعلان جديد للطلاب</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            يظهر الإعلان فوراً في لوحة تحكم جميع الطلاب
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary">
          ⬅️ لوحة الأدمن
        </Link>
      </div>

      <div className="card">
        {message && (
          <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: 16 }}>
            <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
            <div>{message.text}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">عنوان الإعلان</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: تنبيه هام بخصوص موعد امتحان الباب الثاني"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">تفاصيل ونص الإعلان</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="اكتب التوجيهات أو التعليمات بالتفصيل للطلاب..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: 12 }}>
            {loading ? 'جارٍ نشر الإعلان...' : 'نشر الإعلان الآن 📢'}
          </button>
        </form>
      </div>
    </div>
  );
}
