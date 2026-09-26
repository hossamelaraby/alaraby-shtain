'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';

const SECTIONS = [
  {
    title: '🏷️ هوية المنصة والمدرس (الأساسية)',
    fields: [
      { key: 'platform_name', label: 'اسم المنصة', type: 'text', placeholder: 'العربي شتاين' },
      { key: 'teacher_name', label: 'اسم المدرس', type: 'text', placeholder: 'محمد العربي' },
      { key: 'teacher_bio', label: 'نبذة عن المدرس وتخصصه', type: 'textarea', placeholder: 'مدرس أول الفيزياء للثانوية العامة والمراحل التعليمية' },
      { key: 'logo_url', label: 'رابط اللوجو (شعار المنصة)', type: 'text', placeholder: 'https://...' },
      { key: 'favicon_url', label: 'رابط أيقونة المتصفح (Favicon)', type: 'text', placeholder: 'https://...' },
    ],
  },
  {
    title: '🎨 ألوان الهوية البصرية',
    fields: [
      { key: 'primary_color', label: 'اللون الأساسي (Primary Physics Dark)', type: 'color' },
      { key: 'secondary_color', label: 'اللون الثانوي (Accent Electric Blue)', type: 'color' },
    ],
  },
  {
    title: '📞 بيانات التواصل والدعم الفني للطلاب',
    fields: [
      { key: 'whatsapp_number', label: 'رقم الواتساب للاستفسارات', type: 'text', placeholder: '+201012345678' },
      { key: 'phone_number', label: 'رقم الهاتف المباشر', type: 'text', placeholder: '+201012345678' },
      { key: 'support_email', label: 'البريد الإلكتروني للدعم', type: 'text', placeholder: 'support@alaraby-shtain.com' },
      { key: 'youtube_url', label: 'رابط قناة اليوتيوب', type: 'text', placeholder: 'https://youtube.com/@...' },
      { key: 'facebook_url', label: 'رابط صفحة الفيسبوك', type: 'text', placeholder: 'https://facebook.com/...' },
    ],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      const userIsAdmin = profile?.role === 'admin';
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // محاولة الجلب عبر API أولاً ثم قاعدة البيانات
        const { ok, body } = await adminFetch('/api/admin/settings');
        if (ok && body.settings) {
          setSettings(body.settings);
        } else {
          const { data: settingsData } = await supabase
            .from('platform_settings')
            .select('*')
            .eq('id', 1)
            .single();
          setSettings(settingsData || {});
        }
      }
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError('');
    setSaving(true);

    const { id, updated_at, ...updateData } = settings;

    // استخدام الـ API المضمون
    const { ok, body } = await adminFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });

    setSaving(false);

    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } else {
      // محاولة احتياطية مباشرة عبر Supabase
      const { error: directError } = await supabase
        .from('platform_settings')
        .update(updateData)
        .eq('id', 1);

      if (!directError) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        setError(body?.error || directError.message || 'تعذر حفظ الإعدادات');
      }
    }
  }

  if (isAdmin === null) {
    return (
      <div className="container">
        <div className="skeleton skeleton-card"></div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="container-narrow" style={{ marginTop: 40 }}>
        <div className="alert alert-danger" style={{ textAlign: 'center' }}>
          <span>🚫</span>
          <div>هذه الصفحة مخصصة للأدمن (مستر محمد العربي) فقط.</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/dashboard" className="btn btn-secondary">
            العودة للوحة الطالب
          </Link>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container">
        <div className="skeleton skeleton-card"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>🎨 تخصيص إعدادات وهوية المنصة</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            تنعكس هذه الإعدادات فوراً على كافة صفحات المنصة وشاشات الطلاب بدون تعديل كود
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary">
          ⬅️ لوحة الأدمن
        </Link>
      </div>

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <span>✅</span>
          <div>تم حفظ وتطبيق التعديلات بنجاح على المنصة!</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSave}>
        {SECTIONS.map((sec, secIdx) => (
          <div key={secIdx} className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 17, color: '#0f172a' }}>{sec.title}</h3>
            {sec.fields.map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder={field.placeholder}
                    value={settings[field.key] || ''}
                    onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                  />
                ) : field.type === 'color' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="color"
                      value={settings[field.key] || (field.key === 'primary_color' ? '#0b132b' : '#0284c7')}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                      style={{ width: 64, height: 40, border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#64748b' }}>
                      {settings[field.key] || (field.key === 'primary_color' ? '#0b132b' : '#0284c7')}
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder={field.placeholder}
                    value={settings[field.key] || ''}
                    onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ position: 'sticky', bottom: 20, zIndex: 30 }}>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={saving}
            style={{ padding: 14, fontSize: 16, boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}
          >
            {saving ? 'جارٍ حفظ الإعدادات...' : 'حفظ ونشر التغييرات لكافة الطلاب 💾'}
          </button>
        </div>
      </form>
    </div>
  );
}
