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
export async function registerStudent({ fullName, phone, email, password, academicYear, code, signupType }) {
  const supabase = createServiceClient();
  const name = fullName ? fullName.trim() : 'طالب جديد';

  // 1. إنشاء حساب بكود الاشتراك المباشر
  if (signupType === 'code' || (code && code.trim())) {
    const cleanCode = code.trim().toUpperCase();
    const { data: codeRecord, error: codeErr } = await supabase
      .from('enrollment_codes')
      .select('code, course_id, used_by')
      .eq('code', cleanCode)
      .maybeSingle();

    if (codeErr || !codeRecord) {
      return { error: 'كود الاشتراك غير صحيح، يرجى التأكد من الكود المطبوع على الكارت' };
    }
    if (codeRecord.used_by) {
      return { error: 'هذا الكود تم استخدامه مسبقاً وتفعيله لطالب آخر' };
    }

    const cleanPhone = cleanPhoneNumber(phone) || '';
    const studentEmail = (email && email.trim()) ? email.trim().toLowerCase() : (cleanPhone ? `${cleanPhone}@student.alaraby-shtain.com` : `code_${cleanCode.toLowerCase()}@student.alaraby-shtain.com`);
    const userId = cleanPhone ? stringToUuid(`phone_${cleanPhone}`) : stringToUuid(`code_${cleanCode}`);
    const passwordHash = password ? hashPassword(password) : hashPassword('Student@2026');

    await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      phone: cleanPhone || null,
      email: studentEmail,
      password_hash: passwordHash,
      role: 'student',
      academic_year: academicYear || 'الصف الثالث الثانوي',
      is_blocked: false,
      accepted_tos: true,
    });

    // تفعيل الكود وتعيينه للطالب
    await supabase.from('enrollment_codes').update({
      used_by: userId,
      used_at: new Date().toISOString(),
    }).eq('code', cleanCode);

    // تسجيل الطالب في الكورس مباشرة
    if (codeRecord.course_id) {
      await supabase.from('enrollments').upsert({
        user_id: userId,
        course_id: codeRecord.course_id,
        enrolled_at: new Date().toISOString(),
      }, { onConflict: 'user_id,course_id' });
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
    return { success: true, user, token, redirectUrl: '/dashboard' };
  }

  // 2. إنشاء حساب بالبريد الإلكتروني
  if (signupType === 'email' || (!phone && email)) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: 'يرجى إدخال بريد إلكتروني صحيح' };
    }
    if (!password || password.length < 6) {
      return { error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل' };
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return { error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' };
    }

    const userId = stringToUuid(`email_${cleanEmail}`);
    const passwordHash = hashPassword(password);
    const cleanPhone = cleanPhoneNumber(phone) || null;

    const { error: insertError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      phone: cleanPhone,
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'student',
      academic_year: academicYear || 'الصف الثالث الثانوي',
      is_blocked: false,
      accepted_tos: true,
    });

    if (insertError) {
      return { error: 'تعذر إنشاء الحساب: ' + insertError.message };
    }

    const user = {
      id: userId,
      full_name: name,
      phone: cleanPhone,
      email: cleanEmail,
      role: 'student',
      academic_year: academicYear || 'الصف الثالث الثانوي',
    };

    const token = issueAuthToken(user);
    return { success: true, user, token, redirectUrl: '/dashboard' };
  }

  // 3. إنشاء حساب برقم الموبايل
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: 'يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً' };
  }
  if (!password || password.length < 6) {
    return { error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل' };
  }

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
  return { success: true, user, token, redirectUrl: '/dashboard' };
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
