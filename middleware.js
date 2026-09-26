import { NextResponse } from 'next/server';

/**
 * Security headers تُطبّق على كل استجابة من التطبيق.
 * ده بيغطي طبقة الحماية العامة اللي كانت متعملة بـ helmet في نسخة Node/Express.
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;

  // حماية مسارات الأدمن من الدخول المباشر بالـ URL
  if (pathname.startsWith('/admin')) {
    const userRole = req.cookies.get('user_role')?.value;
    if (userRole && userRole !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'admin-required');
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();

  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "media-src 'self' blob: https:; " +
    "frame-ancestors 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://accounts.google.com https://*.vercel.app; " +
    "img-src 'self' data: https: blob:;"
  );
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return res;
}

export const config = {
  matcher: '/:path*',
};
