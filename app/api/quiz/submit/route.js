import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { resolveAuthUser } from '@/lib/auth-helper';

export async function POST(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const user = await resolveAuthUser(authHeader.replace('Bearer ', ''));
  if (!user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }
  const userId = user.id;

  const { quiz_id, answers } = await req.json(); // answers: { question_id: selected_index }
  if (!quiz_id || !answers) {
    return NextResponse.json({ error: 'quiz_id وanswers مطلوبين' }, { status: 400 });
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('pass_percentage')
    .eq('id', quiz_id)
    .single();

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, correct_index')
    .eq('quiz_id', quiz_id);

  if (!questions?.length) return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });

  let score = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correct_index) score++;
  }
  const total = questions.length;
  const percentage = (score / total) * 100;
  const passed = percentage >= (quiz?.pass_percentage || 50);

  const { error: insertError } = await supabase.from('quiz_attempts').insert({
    quiz_id,
    user_id: userId,
    score,
    total,
    passed,
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ score, total, percentage: Math.round(percentage), passed });
}
