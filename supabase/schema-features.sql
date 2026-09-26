-- ============================================================
-- امتحانات إلكترونية + تتبع تقدم المشاهدة + إعلانات المدرس
-- ============================================================

-- امتحان واحد مرتبط بدرس معين (اختياري - مش كل درس لازم يكون له امتحان)
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  title text not null,
  pass_percentage int default 50,
  created_at timestamptz default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null, -- مثال: ["اختيار أ", "اختيار ب", "اختيار ج", "اختيار د"]
  correct_index int not null, -- index الإجابة الصحيحة (0-based) - لا يُكشف للطالب أبدًا عبر RLS
  order_index int default 0
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  score int not null,
  total int not null,
  passed boolean not null,
  submitted_at timestamptz default now()
);

-- تتبع تقدم مشاهدة كل طالب لكل درس
create table video_progress (
  user_id uuid references auth.users(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  watched_seconds int default 0,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, video_id)
);

-- إعلانات المدرس لكل طلابه (تظهر أعلى لوحة تحكم الطالب)
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  course_id uuid references courses(id) on delete cascade, -- null = يظهر لكل الطلاب في كل الكورسات
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
alter table video_progress enable row level security;
alter table announcements enable row level security;

-- الأسئلة وإجاباتها الصحيحة ممنوع قراءتها مباشرة من العميل نهائيًا
-- (التسليم للطالب والتصحيح بيحصلوا عبر API بصلاحية service role بيشيل correct_index)
create policy "no direct client access to quiz questions"
  on quiz_questions for select
  using (false);

create policy "quizzes metadata publicly readable"
  on quizzes for select
  using (true);

-- الطالب يشوف محاولاته هو بس
create policy "users see their own quiz attempts"
  on quiz_attempts for select
  using (auth.uid() = user_id);

-- الطالب يشوف ويحدّث تقدمه هو بس
create policy "users manage their own progress"
  on video_progress for all
  using (auth.uid() = user_id);

-- الإعلانات تُقرأ من الجميع (الفلترة حسب الكورس تتم في كود التطبيق)
create policy "announcements publicly readable"
  on announcements for select
  using (true);
