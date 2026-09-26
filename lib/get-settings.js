import { createServiceClient } from './supabase-server';

/**
 * يجلب إعدادات المنصة (اسم، لوجو، ألوان، بيانات المدرس، أرقام التواصل).
 * مصمم للاستدعاء من Server Components، والنتيجة تُستخدم لبناء
 * CSS variables ديناميكية + عناصر الواجهة بدون أي كود مكرر.
 */
export async function getPlatformSettings() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // قيم افتراضية احتياطية خاصة بمنصة العربي شتاين (فيزياء - مستر محمد العربي)
    return {
      platform_name: 'العربي شتاين | Alaraby Shtain',
      logo_url: null,
      favicon_url: null,
      teacher_name: 'محمد العربي',
      teacher_photo_url: null,
      teacher_bio: 'مدرس أول الفيزياء للثانوية العامة',
      primary_color: '#0b132b',
      secondary_color: '#0284c7',
      phone_number: '',
      whatsapp_number: '',
      facebook_url: '',
      youtube_url: '',
      support_email: '',
    };
  }
  return {
    ...data,
    platform_name: data.platform_name || 'العربي شتاين | Alaraby Shtain',
    teacher_name: data.teacher_name || 'محمد العربي',
    teacher_bio: data.teacher_bio || 'مدرس أول الفيزياء للثانوية العامة',
  };
}
