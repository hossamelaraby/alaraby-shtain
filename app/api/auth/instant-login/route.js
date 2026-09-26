import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createServiceClient } from '@/lib/supabase-server';

const JWT_SECRET = process.env.VIDEO_JWT_SECRET || 'alaraby_shtain_physics_video_secret_default_key_2026';

import crypto from 'crypto';

function stringToUuid(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { type, phone, email, code } = body;

  let user = null;

  if (type === 'admin') {
    // دخول كأدمن (مستر محمد العربي)
    user = {
      id: '00000000-0000-4000-a000-000000000001',
      email: 'mohamed.alaraby@alaraby-shtain.com',
      role: 'admin',
      name: 'مستر محمد العربي',
    };
  } else if (type === 'phone' && phone) {
    const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
    user = {
      id: stringToUuid(`phone_${cleanPhone}`),
      email: `${cleanPhone}@student.alaraby-shtain.com`,
      phone: cleanPhone,
      role: 'student',
      name: `طالب (${cleanPhone})`,
    };
  } else if (type === 'google' && email) {
    const cleanEmail = email.trim().toLowerCase();
    user = {
      id: stringToUuid(`google_${cleanEmail}`),
      email: cleanEmail,
      role: 'student',
      name: cleanEmail.split('@')[0],
    };
  } else if (type === 'code' && code) {
    const cleanCode = code.trim().toUpperCase();
    user = {
      id: stringToUuid(`student_${cleanCode}`),
      email: `${cleanCode}@student.alaraby-shtain.com`,
      role: 'student',
      name: `طالب (${cleanCode})`,
    };
  } else {
    // دخول طالب سريع افتراضي
    const randomId = Math.floor(1000 + Math.random() * 9000);
    user = {
      id: crypto.randomUUID(),
      email: `student_${randomId}@alaraby-shtain.com`,
      role: 'student',
      name: `طالب فيزياء #${randomId}`,
    };
  }

  // محاولة حفظ/تحديث المستخدم في جدول profiles لو قاعدة البيانات متاحة
  const supabase = createServiceClient();
  try {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      accepted_tos: true,
    });
  } catch (e) {}

  // توليد التوكن المشفر الصالح لمدة 30 يوم
  const token = jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return NextResponse.json({
    success: true,
    token,
    user,
  });
}
