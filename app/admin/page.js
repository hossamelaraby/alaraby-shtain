'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

export default function AdminHomePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/stats').then(({ ok, body }) => {
      if (ok) setStats(body);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container">
      {/* رأس لوحة التحكم */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '28px 24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(2, 132, 199, 0.3)', color: '#38bdf8', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              ⚙️ لوحة تحكم المدرس / الأدمن
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, margin: 0 }}>منصة العربي شتاين — مستر محمد العربي</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 0' }}>
              إدارة المحتوى التعليمي، الطلاب، بنك الأسئلة، وتوليد الأكواد بكفاءة وأمان
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-outline" style={{ color: '#38bdf8', borderColor: '#38bdf8' }}>
            👁️ معاينة لوحة الطالب
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصائيات الفورية */}
      {loading ? (
        <div className="stats-grid">
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      ) : (
        stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.coursesCount ?? 0}</div>
              <div className="stat-label">📚 الكورسات المتاحة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.studentsCount ?? 0}</div>
              <div className="stat-label">👥 الطلاب المسجلين</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.enrollmentsCount ?? 0}</div>
              <div className="stat-label">🎓 الاشتراكات النشطة</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.codesUnused ?? 0}</div>
              <div className="stat-label">🎟️ الأكواد المتاحة للتوزيع</div>
            </div>
          </div>
        )
      )}

      {/* شبكة خيارات الإدارة */}
      <h2 style={{ marginBottom: 16 }}>🛠️ أقسام الإدارة السريعة</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Link href="/admin/courses" className="card card-interactive" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
          <h3 style={{ fontSize: 18, color: '#0f172a' }}>إدارة الكورسات والدروس</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            إنشاء كورسات، إضافة دروس جديدة، توليد أكواد الاشتراك بالجملة، وإعداد الامتحانات
          </p>
        </Link>

        <Link href="/admin/students" className="card card-interactive" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
          <h3 style={{ fontSize: 18, color: '#0f172a' }}>إدارة الطلاب</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            عرض قائمة الطلاب المسجلين، فحص الكورسات المشتركين بها، حظر وفك حظر الطلاب يدوياً
          </p>
        </Link>

        <Link href="/admin/announcements" className="card card-interactive" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
          <h3 style={{ fontSize: 18, color: '#0f172a' }}>نشر إعلان جديد</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            إرسال إشعار فوري يظهر أعلى شاشات جميع الطلاب لإبلاغهم بمواعيد الحصص أو الامتحانات
          </p>
        </Link>

        <Link href="/admin/settings" className="card card-interactive" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
          <h3 style={{ fontSize: 18, color: '#0f172a' }}>إعدادات المنصة والهوية</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            تعديل اسم المنصة، اللوجو، الألوان، بيانات مستر محمد العربي، وأرقام الواتساب والدعم
          </p>
        </Link>
      </div>
    </div>
  );
}
