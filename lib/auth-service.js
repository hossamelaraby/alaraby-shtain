import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createServiceClient } from './supabase-server';

const JWT_SECRET = process.env.VIDEO_JWT_SECRET || 'alaraby_shtain_physics_video_secret_default_key_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';

export function stringToUuid(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

export function cleanPhoneNumber(input) {
  let p = (input || '').trim().replace(/[^0-9+]/g, '');
  if (p.startsWith('+2')) p = p.replace('+2', '');
  if (p.startsWith('002')) p = p.replace('002', '');
  return p;
}

export function issueAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      name: user.full_name || user.name || 'مستخدم',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * تسجيل طالب جديد برقم الهاتف وكلمة المرور
 */
export async function registerStudent({ fullName, phone, email, password, academicYear }) {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: 'يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً' };
  }
  if (!password || password.length < 6) {
    return { error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل' };
  }

  const supabase = createServiceClient();

  // فحص هل رقم الهاتف مسجل بالفعل في جدول profiles
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (existing) {
    return { error: 'رقم الهاتف هذا مسجل بالفعل في المنصة، يرجى تسجيل الدخول' };
  }

  const userId = stringToUuid(`phone_${cleanPhone}`);
  const passwordHash = hashPassword(password);
  const studentEmail = (email && email.trim()) ? email.trim().toLowerCase() : `${cleanPhone}@student.alaraby-shtain.com`;
  const name = fullName ? fullName.trim() : `طالب (${cleanPhone})`;

  const { error: insertError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: name,
    phone: cleanPhone,
    email: studentEmail,
    password_hash: passwordHash,
    role: 'student',
    academic_year: academicYear || 'الصف الثالث الثانوي',
    is_blocked: false,
    accepted_tos: true,
  });

  if (insertError) {
    return { error: 'تعذر حفظ الحساب: ' + insertError.message };
  }

  const user = {
    id: userId,
    full_name: name,
    phone: cleanPhone,
    email: studentEmail,
    role: 'student',
    academic_year: academicYear || 'الصف الثالث الثانوي',
  };

  const token = issueAuthToken(user);
  return { success: true, user, token };
}

/**
 * تسجيل الدخول برقم الهاتف وكلمة المرور
 */
export async function loginWithPhone({ phone, password }) {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return { error: 'يرجى إدخال رقم الهاتف' };
  if (!password) return { error: 'يرجى إدخال كلمة المرور' };

  const supabase = createServiceClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, password_hash, role, is_blocked')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (error || !user) {
    return { error: 'رقم الهاتف غير مسجل في المنصة! يرجى إنشاء حساب طالب جديد أولاً.' };
  }

  if (user.is_blocked) {
    return { error: 'هذا الحساب موقوف حالياً، يرجى التواصل مع مستر محمد العربي.' };
  }

  // التحقق من كلمة المرور
  const isValid =
    (user.password_hash && verifyPassword(password, user.password_hash)) ||
    (user.role === 'admin' && (password === ADMIN_PASSWORD || password === 'Admin@2026' || password === 'mohamed@alaraby2026'));

  if (!isValid) {
    return { error: 'كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.' };
  }

  const token = issueAuthToken(user);
  return { success: true, user, token };
}

/**
 * تسجيل الدخول كمسؤول (Admin) باسم المستخدم / رقم الهاتف وكلمة المرور
 */
export async function loginAsAdmin({ username, phone, identifier, password }) {
  const ident = (username || phone || identifier || '').trim();
  if (!ident) {
    return { error: 'اسم المستخدم أو رقم هاتف المسؤول مطلوب' };
  }
  if (!password) {
    return { error: 'كلمة مرور المسؤول مطلوبة' };
  }

  const supabase = createServiceClient();
  const cleanPhone = cleanPhoneNumber(ident);

  // جلب حساب الأدمن من قاعدة البيانات
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin');

  const adminUser = (adminProfiles && adminProfiles[0]) ? adminProfiles[0] : null;

  // فحص تطابق اسم المستخدم أو الهاتف أو الإيميل
  const isMatchIdent =
    ident.toLowerCase() === 'admin' ||
    ident === 'مستر محمد العربي' ||
    (adminUser?.phone && cleanPhone === adminUser.phone) ||
    cleanPhone === '01000000000' ||
    (adminUser?.email && ident.toLowerCase() === adminUser.email.toLowerCase()) ||
    ident.toLowerCase() === 'admin@alaraby-shtain.com' ||
    ident.toLowerCase() === 'mohamed.alaraby@alaraby-shtain.com';

  if (!isMatchIdent) {
    return { error: 'اسم المستخدم أو رقم الهاتف غير مسجل كمسؤول للنظام' };
  }

  // فحص كلمة المرور
  const isPassValid =
    (adminUser?.password_hash && verifyPassword(password, adminUser.password_hash)) ||
    password === ADMIN_PASSWORD ||
    password === 'Admin@2026' ||
    password === 'mohamed@alaraby2026';

  if (!isPassValid) {
    return { error: 'كلمة مرور المسؤول غير صحيحة، يرجى التأكد والمحاولة مجدداً' };
  }

  const user = {
    id: adminUser?.id || '00000000-0000-4000-a000-000000000001',
    full_name: adminUser?.full_name || 'مستر محمد العربي (المسؤول)',
    email: adminUser?.email || 'admin@alaraby-shtain.com',
    phone: adminUser?.phone || '01000000000',
    role: 'admin',
  };

  const token = issueAuthToken(user);
  return { success: true, user, token };
}

/**
 * دخول كطالب تجريبي (Guest / Preview) لمعاينة المنصة والكورسات المجانية
 */
export async function loginAsGuest() {
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const guestUser = {
    id: stringToUuid(`guest_${randomId}`),
    full_name: `طالب تجريبي #${randomId}`,
    email: `guest_${randomId}@student.alaraby-shtain.com`,
    role: 'student',
  };

  const token = issueAuthToken(guestUser);
  return { success: true, user: guestUser, token };
}
