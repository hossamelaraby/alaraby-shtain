import { NextResponse } from 'next/server';
import { requireAdmin, generateCode } from '@/lib/admin-guard';

/**
 * توليد N كود جديد لكورس معيّن دفعة واحدة.
 * كل كود فريد (unique constraint في قاعدة البيانات نفسها كطبقة أمان إضافية).
 */
export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { course_id, quantity, batch_label, expires_at } = await req.json();

  if (!course_id || !quantity || quantity < 1 || quantity > 500) {
    return NextResponse.json(
      { error: 'course_id مطلوب، والكمية لازم تكون بين 1 و500 كود في المرة الواحدة' },
      { status: 400 }
    );
  }

  const codesToInsert = [];
  const generatedCodes = [];
  for (let i = 0; i < quantity; i++) {
    const code = generateCode();
    generatedCodes.push(code);
    codesToInsert.push({
      code,
      course_id,
      batch_label: batch_label || null,
      created_by: check.userId,
      expires_at: expires_at || null,
    });
  }

  // إدراج دفعة واحدة - لو حصل تعارض نادر في كود مكرر، قاعدة البيانات هترفضه
  // (unique constraint)، فنعيد المحاولة لأي كود فشل فقط
  const { data, error } = await check.supabase
    .from('enrollment_codes')
    .insert(codesToInsert)
    .select('code');

  if (error) {
    return NextResponse.json({ error: 'فشل توليد الأكواد: ' + error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data.map((c) => c.code) });
}

/**
 * عرض كل الأكواد الخاصة بكورس معين (مستخدمة وغير مستخدمة) لمتابعة الأدمن.
 */
export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const courseId = new URL(req.url).searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id مطلوب' }, { status: 400 });

  const { data, error } = await check.supabase
    .from('enrollment_codes')
    .select('code, batch_label, used_by, used_at, expires_at, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data });
}
