import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { resolveAuthUser } from '@/lib/auth-helper';

export async function GET(req) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');

  const user = await resolveAuthUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول' }, { status: 401 });
  }
  const userId = user.id;

  // لو المستخدم أدمن، رجع له كل الكورسات بدروسها للمعاينة المباشرة
  if (user.role === 'admin') {
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, description, price, videos(id, title, order_index, unlock_after_days)');

    const formatted = (allCourses || []).map((c) => ({
      ...c,
      videos: (c.videos || []).map((v) => ({
        ...v,
        locked: false,
        unlocks_at: new Date().toISOString(),
      })),
    }));

    return NextResponse.json({ courses: formatted });
  }

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('enrolled_at, courses(id, title, description)')
    .eq('user_id', userId);

  if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 500 });

  // لكل كورس، هات دروسه مع حساب هل كل درس متاح دلوقتي (drip content) ولا لسه
  const coursesWithVideos = await Promise.all(
    (enrollments || []).map(async (en) => {
      if (!en.courses) return null;
      const { data: videos } = await supabase
        .from('videos')
        .select('id, title, order_index, unlock_after_days')
        .eq('course_id', en.courses.id)
        .order('order_index', { ascending: true });

      const enrolledAt = new Date(en.enrolled_at);
      const videosWithStatus = (videos || []).map((v) => {
        const unlockDate = new Date(enrolledAt.getTime() + (v.unlock_after_days || 0) * 86400000);
        return {
          id: v.id,
          title: v.title,
          order_index: v.order_index,
          locked: new Date() < unlockDate,
          unlocks_at: unlockDate.toISOString(),
        };
      });

      return { ...en.courses, videos: videosWithStatus };
    })
  );

  return NextResponse.json({ courses: (coursesWithVideos || []).filter(Boolean) });
}
