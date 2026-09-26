'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function TosGate({ onAccepted }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  async function handleAccept() {
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      setSubmitting(false);
      return;
    }

    await supabase.from('profiles').upsert({
      id: userId,
      email: userData.user.email,
      accepted_tos: true,
      accepted_tos_at: new Date().toISOString(),
    });

    setSubmitting(false);
    onAccepted();
  }

  return (
    <div className="container-narrow">
      <div className="card" style={{ padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📜</div>
          <h2>اتفاقية استخدام المحتوى وحماية الفيديوهات</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            يرجى قراءة الشروط والموافقة عليها للوصول إلى المحاضرات
          </p>
        </div>

        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 14,
            fontSize: 13,
            lineHeight: 1.8,
            color: '#334155',
            marginBottom: 16,
          }}
        >
          <p>
            يُمنع منعاً باتاً تسجيل، تحميل، تصوير الشاشة، نسخ، أو إعادة نشر أي جزء من محتوى فيديوهات ومحاضرات منصة العربي شتاين (مستر محمد العربي) بأي وسيلة كانت.
          </p>
          <p>
            تتضمن المنصة تقنيات علامة مائية ديناميكية متقدمة مشفرة تتبع الحساب والمشاهد في كل لحظة. أي محاولة لمشاركة الحساب أو تسريب المحتوى تعرّض صاحب الحساب للحظر النهائي الفوري والملاحقة القانونية.
          </p>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: '#0369a1',
            marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <span>أقر بأنني قرأت شروط الاستخدام وأوافق على الالتزام بها تماماً</span>
        </label>

        <button
          type="button"
          disabled={!checked || submitting}
          onClick={handleAccept}
          className="btn btn-primary btn-block"
          style={{ padding: 12 }}
        >
          {submitting ? 'جارٍ التأكيد...' : 'موافقة ومتابعة المشاهدة 🚀'}
        </button>
      </div>
    </div>
  );
}
