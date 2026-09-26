'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminFetch } from '@/lib/admin-fetch';

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function verifyAdmin() {
      const token = localStorage.getItem('sb_access_token');
      const role = localStorage.getItem('user_role');

      if (!token || role !== 'admin') {
        setChecking(false);
        setAuthorized(false);
        setTimeout(() => {
          window.location.replace('/login?error=admin-required&redirect=' + encodeURIComponent(pathname));
        }, 1200);
        return;
      }

      // التحقق الفعلي من صحة التوكن مع الخادم
      try {
        const { ok, status } = await adminFetch('/api/admin/stats');
        if (ok) {
          setAuthorized(true);
          setChecking(false);
        } else {
          setChecking(false);
          setAuthorized(false);
          localStorage.removeItem('sb_access_token');
          localStorage.removeItem('user_role');
          setTimeout(() => {
            window.location.replace('/login?error=session-expired&redirect=' + encodeURIComponent(pathname));
          }, 1200);
        }
      } catch (err) {
        setChecking(false);
        setAuthorized(false);
        window.location.replace('/login');
      }
    }

    verifyAdmin();
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    document.cookie = 'sb_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  }

  // شاشة الفحص والتأكد من الصلاحيات (تمنع ظهور أي محتوى إداري للمتطفلين)
  if (checking) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🛡️</div>
        <h3 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>منطقة الإدارة المحمية — منصة العربي شتاين</h3>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>جارٍ التحقق من صلاحيات المسؤول وأمان الجلسة...</p>
        <div className="skeleton" style={{ width: 140, height: 6, borderRadius: 3, marginTop: 16 }}></div>
      </div>
    );
  }

  // شاشة رفض الوصول إذا لم يكن أدمن
  if (!authorized) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
        <h2 style={{ color: '#ef4444', fontSize: 22, marginBottom: 8 }}>غير مصرح بالدخول — منطقة خاصة بالمسؤول</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 450, lineHeight: 1.6, marginBottom: 20 }}>
          لا يمكنك فتح لوحة تحكم المنصة دون تسجيل الدخول بحساب المسؤول (مستر محمد العربي). يتم الآن توجيهك لصفحة تسجيل الدخول...
        </p>
        <Link href="/login" className="btn btn-primary" style={{ padding: '10px 24px' }}>
          الذهاب لصفحة تسجيل الدخول الآن
        </Link>
      </div>
    );
  }

  // شريط تنقل الإدارة الموحد والمحمي
  const navItems = [
    { href: '/admin', label: '📊 الرئيسية', active: pathname === '/admin' },
    { href: '/admin/students', label: '👥 إدارة الطلاب', active: pathname.startsWith('/admin/students') },
    { href: '/admin/courses', label: '📚 الكورسات والأكواد', active: pathname.startsWith('/admin/courses') },
    { href: '/admin/announcements', label: '📢 الإعلانات', active: pathname.startsWith('/admin/announcements') },
    { href: '/admin/settings', label: '⚙️ الإعدادات', active: pathname.startsWith('/admin/settings') },
  ];

  return (
    <div>
      {/* شريط الإدارة العلوي */}
      <div style={{ background: '#0b132b', borderBottom: '1px solid rgba(2, 132, 199, 0.25)', padding: '10px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛡️</span>
            <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: 15 }}>لوحة إدارة العربي شتاين</span>
            <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
              مستر محمد العربي
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 8,
                  color: item.active ? '#fff' : '#94a3b8',
                  background: item.active ? '#0284c7' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/dashboard"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 8,
                color: '#38bdf8',
                border: '1px solid #0284c7',
                textDecoration: 'none',
                marginRight: 6,
              }}
            >
              👁️ معاينة الطالب
            </Link>

            <button
              onClick={handleLogout}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 8,
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
              }}
            >
              🚪 تسجيل خروج
            </button>
          </div>
        </div>
      </div>

      {/* محتوى الصفحة */}
      <main style={{ minHeight: '80vh', padding: '24px 0' }}>
        {children}
      </main>
    </div>
  );
}
