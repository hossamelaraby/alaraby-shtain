import { Cairo } from 'next/font/google';
import Link from 'next/link';
import { getPlatformSettings } from '@/lib/get-settings';
import LogoutButton from '@/components/LogoutButton';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const settings = await getPlatformSettings();
  const name = settings.platform_name || 'العربي شتاين | Alaraby Shtain';
  const teacher = settings.teacher_name || 'محمد العربي';
  return {
    title: `${name} — فيزياء الثانوية العامة | مستر ${teacher}`,
    description: `المنصة التعليمية الرسمية لمادة الفيزياء مع مستر ${teacher} (العربي شتاين). شرح مبسط، اختبارات إلكترونية ومتابعة دورية.`,
    icons: settings.favicon_url ? [{ rel: 'icon', url: settings.favicon_url }] : undefined,
  };
}

export default async function RootLayout({ children }) {
  const settings = await getPlatformSettings();

  const themeStyle = {
    '--color-primary': settings.primary_color || '#0b132b',
    '--color-secondary': settings.secondary_color || '#0284c7',
  };

  const platformName = settings.platform_name || 'العربي شتاين';
  const teacherName = settings.teacher_name || 'محمد العربي';
  const teacherBio = settings.teacher_bio || 'مدرس أول الفيزياء للثانوية العامة والمراحل التعليمية';

  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className} style={themeStyle}>
        <header className="site-header">
          <div className="header-container">
            <Link href="/dashboard" className="header-brand">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={platformName}
                  style={{ height: 44, width: 'auto', borderRadius: 8, objectFit: 'contain' }}
                />
              ) : (
                <div className="brand-icon-box">
                  ⚛️
                </div>
              )}
              <div className="brand-title">
                <span>{platformName}</span>
                <span className="brand-subtitle">Alaraby Shtain Physics</span>
              </div>
            </Link>

            <div className="header-actions">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 180px)' }}>{children}</main>

        <footer className="site-footer">
          <div className="footer-content">
            <p className="footer-teacher">مستر {teacherName}</p>
            <p className="footer-bio">{teacherBio}</p>
            <div className="footer-links">
              {settings.phone_number && <span>📞 {settings.phone_number}</span>}
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 واتساب: {settings.whatsapp_number}
                </a>
              )}
              {settings.support_email && (
                <a href={`mailto:${settings.support_email}`}>✉️ {settings.support_email}</a>
              )}
              {settings.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer">
                  ▶️ قناة اليوتيوب
                </a>
              )}
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">
                  📘 فيسبوك
                </a>
              )}
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
              جميع الحقوق محفوظة لمنصة {platformName} © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
