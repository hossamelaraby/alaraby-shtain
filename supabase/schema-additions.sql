-- ============================================================
-- إضافات على السكيما الأساسية - نفّذها بعد schema.sql
-- ============================================================

-- 1) Drip content: كل فيديو يتفتح في وقت محدد بعد الاشتراك
alter table videos add column unlock_after_days int default 0;
-- يعني الفيديو ده يتفتح للطالب بعد X يوم من تاريخ enrolled_at بتاعه

-- 2) قبول اتفاقية الاستخدام (ToS) - إلزامي قبل أي وصول لأي فيديو
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  accepted_tos boolean default false,
  accepted_tos_at timestamptz,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users manage their own profile"
  on profiles for all
  using (auth.uid() = id);

-- 3) أجهزة موثوقة (بعد نجاح OTP لأول مرة) - يبقى مش محتاج OTP كل مرة من نفس الجهاز
create table trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  fingerprint text not null,
  trusted_at timestamptz default now(),
  unique(user_id, fingerprint)
);
alter table trusted_devices enable row level security;
create policy "no direct client access to trusted devices"
  on trusted_devices for select
  using (false);

-- 4) سجل أحداث أمنية (لوحة تنبيهات + ربط webhook)
create table security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_type text not null, -- 'new_device', 'account_locked', 'tab_hidden_during_playback', ...
  details jsonb,
  created_at timestamptz default now()
);
alter table security_events enable row level security;
create policy "no direct client access to security events"
  on security_events for select
  using (false);
