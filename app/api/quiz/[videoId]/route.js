import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(req, { params }) {
  const { videoId } = params;
  const supabase = createServiceClient();

  const authHeader = req.headers.get('authorization') || '';
  const { data: userData, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !userData?.user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, pass_percentage')
    .eq('video_id', videoId)
    .maybeSingle();

  if (!quiz) return NextResponse.json({ quiz: null });

  // نجيب الأسئلة بس من غير عمود correct_index نهائيًا - مايتبعتش للمتصفح خالص
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, question_text, options, order_index')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true });

  return NextResponse.json({ quiz: { ...quiz, questions } });
}
