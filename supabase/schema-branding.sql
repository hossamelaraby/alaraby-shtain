-- ============================================================
-- إعدادات العلامة التجارية (Branding) - صف واحد لكل نسخة منصة
-- ============================================================

-- إضافة دور لكل مستخدم (admin = المدرس / صاحب المنصة، student = الطالب)
alter table profiles add column role text default 'student' check (role in ('admin', 'student'));

-- جدول الإعدادات - صف واحد بس (id ثابت) لأن كل مدرس عنده نسخته المنفصلة
create table platform_settings (
  id int primary key default 1,
  platform_name text default 'العربي شتاين',
  logo_url text,
  favicon_url text,
  teacher_name text default 'محمد العربي',
  teacher_photo_url text,
  teacher_bio text default 'مدرس أول الفيزياء للثانوية العامة والمراحل التعليمية',
  primary_color text default '#0b132b',
  secondary_color text default '#0284c7',
  phone_number text,
  whatsapp_number text,
  facebook_url text,
  youtube_url text,
  support_email text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into platform_settings (id, platform_name, teacher_name, teacher_bio, primary_color, secondary_color)
values (1, 'العربي شتاين', 'محمد العربي', 'مدرس أول الفيزياء للثانوية العامة والمراحل التعليمية', '#0b132b', '#0284c7');

alter table platform_settings enable row level security;

-- أي حد (حتى الزوار) يقدر يقرأ الإعدادات - محتاجينها لعرض الاسم/اللوجو للجميع
create policy "settings are publicly readable"
  on platform_settings for select
  using (true);

-- التعديل بس من الأدمن (المدرس نفسه)
create policy "only admin can update settings"
  on platform_settings for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
