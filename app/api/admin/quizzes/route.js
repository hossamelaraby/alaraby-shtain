import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function POST(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { video_id, title, pass_percentage, questions } = await req.json();

  if (!video_id || !title || !questions?.length) {
    return NextResponse.json(
      { error: 'video_id وtitle وقائمة الأسئلة مطلوبين' },
      { status: 400 }
    );
  }
  for (const q of questions) {
    if (!q.question_text || !q.options?.length || q.correct_index == null) {
      return NextResponse.json({ error: 'كل سؤال لازم يحتوي نص وخيارات وإجابة صحيحة' }, { status: 400 });
    }
  }

  const { data: quiz, error: quizError } = await check.supabase
    .from('quizzes')
    .insert({ video_id, title, pass_percentage: pass_percentage || 50 })
    .select()
    .single();

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });

  const questionsToInsert = questions.map((q, i) => ({
    quiz_id: quiz.id,
    question_text: q.question_text,
    options: q.options,
    correct_index: q.correct_index,
    order_index: i,
  }));

  const { error: qError } = await check.supabase.from('quiz_questions').insert(questionsToInsert);
  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });

  return NextResponse.json({ quiz });
}

export async function GET(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const videoId = new URL(req.url).searchParams.get('video_id');
  const { data, error } = await check.supabase
    .from('quizzes')
    .select('*, quiz_questions(*), quiz_attempts(count)')
    .eq('video_id', videoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // نرتب الأسئلة حسب order_index قبل ما نرجعها (Supabase مابيضمنش الترتيب تلقائيًا في nested select)
  const sorted = (data || []).map((quiz) => ({
    ...quiz,
    quiz_questions: [...quiz.quiz_questions].sort((a, b) => a.order_index - b.order_index),
  }));

  return NextResponse.json({ quizzes: sorted });
}

/**
 * تعديل امتحان موجود: تحديث العنوان/نسبة النجاح، واستبدال كل الأسئلة بالكامل
 * (أبسط وأضمن من محاولة مطابقة كل سؤال قديم بجديد جزئيًا - وبيتفادى تضارب الترتيب).
 */
export async function PATCH(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { quiz_id, title, pass_percentage, questions } = await req.json();

  if (!quiz_id || !title || !questions?.length) {
    return NextResponse.json({ error: 'quiz_id وtitle وقائمة الأسئلة مطلوبين' }, { status: 400 });
  }
  for (const q of questions) {
    if (!q.question_text || !q.options?.length || q.correct_index == null) {
      return NextResponse.json({ error: 'كل سؤال لازم يحتوي نص وخيارات وإجابة صحيحة' }, { status: 400 });
    }
  }

  const { error: updateError } = await check.supabase
    .from('quizzes')
    .update({ title, pass_percentage: pass_percentage || 50 })
    .eq('id', quiz_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: deleteError } = await check.supabase.from('quiz_questions').delete().eq('quiz_id', quiz_id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const questionsToInsert = questions.map((q, i) => ({
    quiz_id,
    question_text: q.question_text,
    options: q.options,
    correct_index: q.correct_index,
    order_index: i,
  }));

  const { error: insertError } = await check.supabase.from('quiz_questions').insert(questionsToInsert);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * حذف امتحان بالكامل (الأسئلة والمحاولات بتتحذف تلقائيًا بفضل on delete cascade في السكيما)
 */
export async function DELETE(req) {
  const check = await requireAdmin(req);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const quizId = new URL(req.url).searchParams.get('quiz_id');
  if (!quizId) return NextResponse.json({ error: 'quiz_id مطلوب' }, { status: 400 });

  const { error } = await check.supabase.from('quizzes').delete().eq('id', quizId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
