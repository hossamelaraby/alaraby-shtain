-- ============================================================
-- سكيما المنصة الكاملة - نفّذها في Supabase SQL Editor
-- ============================================================

-- جدول الكورسات
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric default 0,
  created_at timestamptz default now()
);

-- جدول الفيديوهات (الفيديو نفسه مخزّن في Supabase Storage bucket خاص)
create table videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  storage_path text not null, -- مسار الفيديو المشفر جوه الـ bucket الخاص
  duration_seconds int,
  order_index int default 0,
  created_at timestamptz default now()
);

-- جدول الاشتراكات (مين مشترك في أي كورس)
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id)
);

-- جدول الجلسات النشطة (لمنع تعدد الأجهزة - جلسة واحدة لكل مستخدم)
create table active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_fingerprint text not null,
  last_seen timestamptz default now()
);

-- سجل تدقيق كامل لكل طلب فيديو (لرصد أي سلوك مشبوه وتتبع أي تسريب)
create table video_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  video_id uuid references videos(id),
  ip_address text,
  user_agent text,
  requested_at timestamptz default now()
);

-- حسابات موقوفة مؤقتًا (بعد رصد سلوك آلي مشبوه)
create table locked_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  locked_at timestamptz default now(),
  locked_until timestamptz
);

-- ============================================================
-- Row Level Security - كل جدول مقفول افتراضيًا، وبنفتح بس اللي محتاجينه
-- ============================================================

alter table courses enable row level security;
alter table videos enable row level security;
alter table enrollments enable row level security;
alter table active_sessions enable row level security;
alter table video_access_logs enable row level security;
alter table locked_accounts enable row level security;

-- أي حد مسجل دخول يقدر يشوف قائمة الكورسات (للتصفح والشراء)
create policy "courses are viewable by everyone"
  on courses for select
  using (true);

-- الفيديوهات نفسها (metadata) تظهر بس لو المستخدم مشترك في الكورس بتاعها
create policy "videos visible only to enrolled users"
  on videos for select
  using (
    exists (
      select 1 from enrollments
      where enrollments.course_id = videos.course_id
      and enrollments.user_id = auth.uid()
    )
  );

-- المستخدم يشوف اشتراكاته هو بس
create policy "users see their own enrollments"
  on enrollments for select
  using (auth.uid() = user_id);

-- المستخدم يشوف جلسته هو بس (السيرفر بيتعامل مع الكتابة عبر service role)
create policy "users see their own session"
  on active_sessions for select
  using (auth.uid() = user_id);

-- سجلات الوصول مقفولة تمامًا على العميل - السيرفر بس (service role) يكتب/يقرأ منها
create policy "no client access to logs"
  on video_access_logs for select
  using (false);

create policy "no client access to locks"
  on locked_accounts for select
  using (false);

-- ============================================================
-- Storage: أنشئ bucket اسمه "encrypted-videos" واجعله Private (مش public)
-- من Supabase Dashboard → Storage → New Bucket → uncheck "Public bucket"
-- الوصول للملفات هيبقى بس عن طريق signed URLs مؤقتة من السيرفر (service role)
-- ============================================================
