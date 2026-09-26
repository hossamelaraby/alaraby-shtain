-- ============================================================
-- أول مستخدم يسجل حساب = المدرس/الأدمن تلقائيًا، والباقي طلاب عاديين
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_count int;
  assigned_role text;
begin
  select count(*) into user_count from public.profiles;

  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'student';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, assigned_role);

  return new;
end;
$$ language plpgsql security definer;

-- يُشغَّل تلقائيًا مع كل تسجيل جديد في auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
