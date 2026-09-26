'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LogoutButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      } else {
        const localEmail = localStorage.getItem('user_email');
        const token = localStorage.getItem('sb_access_token');
        if (localEmail && token) {
          setUser({ email: localEmail });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('sb_access_token', session.access_token);
        if (session.user.email) localStorage.setItem('user_email', session.user.email);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('user_email');
    window.location.href = '/login';
  }

  if (loading) return null;

  // لو المستخدم مسجل دخوله
  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 13,
            color: '#e2e8f0',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={user.email}
        >
          👤 {user.email?.split('@')[0]}
        </span>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '6px 12px',
            fontSize: 13,
          }}
        >
          خروج
        </button>
      </div>
    );
  }

  // إخفاء الزر تماماً في لوحة التحكم الإدارية لأن لها شريط أدمن خاص بها، وكذلك في صفحات الدخول والتسجيل
  if (pathname?.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  // لو مش مسجل دخول وهو في صفحة عادية
  return (
    <Link href="/login" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
      تسجيل الدخول
    </Link>
  );
}
