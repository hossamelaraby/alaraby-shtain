import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ تحذير مهم جدًا:
 * SUPABASE_SERVICE_ROLE_KEY بيتخطى كل RLS policies.
 * ده لازم يتستخدم بس جوه API routes (server-side)، وأبدًا في كود بيوصل للمتصفح.
 * تأكد إنه متحط في متغيرات بيئة فيرسل من غير بادئة NEXT_PUBLIC_
 * (لو حطيته بـ NEXT_PUBLIC_ هيتسرب للمتصفح وده كارثة أمنية).
 *
 * ملاحظة: نمرر مفتاح placeholder وقت البناء لو المتغير الحقيقي لسه مش متحط،
 * عشان "next build" ميوقفش بسبب رمي خطأ فوري من مكتبة Supabase أثناء التوليد
 * الثابت (static generation). أي استدعاء فعلي للبيانات هيفشل برسالة واضحة
 * لحد ما تضيف المفتاح الحقيقي في متغيرات بيئة فيرسل.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-build-time-key';

  return createClient(url, key, { auth: { persistSession: false } });
}
