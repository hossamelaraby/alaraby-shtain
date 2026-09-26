-- ============================================================
-- نظام الكورسات + الدروس + أكواد الاشتراك (يُنفَّذ بعد باقي ملفات السكيما)
-- ============================================================

-- أكواد الاشتراك: كل كود مرتبط بكورس محدد، يُستخدم مرة واحدة فقط
create table enrollment_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  course_id uuid references courses(id) on delete cascade,
  batch_label text, -- تسمية اختيارية للدفعة (مثال: "دفعة يناير 2026")
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz, -- اختياري - null يعني بلا تاريخ انتهاء
  created_at timestamptz default now()
);

alter table enrollment_codes enable row level security;

-- ممنوع أي قراءة مباشرة من العميل - كل التعامل عبر API routes بصلاحية service role
-- (لو سمحنا بقراءة مباشرة، أي طالب فضولي يقدر يجرب يخمن أكواد تانية)
create policy "no direct client access to codes"
  on enrollment_codes for all
  using (false);

-- فهرس لتسريع البحث عن الكود وقت التفعيل
create index idx_enrollment_codes_code on enrollment_codes(code);
create index idx_enrollment_codes_course on enrollment_codes(course_id);
