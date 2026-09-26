import { NextResponse } from 'next/server';

/**
 * Security headers تُطبّق على كل استجابة من التطبيق.
 * ده بيغطي طبقة الحماية العامة اللي كانت متعملة بـ helmet في نسخة Node/Express.
 */
export function middleware(req) {
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
