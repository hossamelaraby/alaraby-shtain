ALTER TABLE enrollment_codes DROP CONSTRAINT IF EXISTS enrollment_codes_created_by_fkey;
ALTER TABLE enrollment_codes DROP CONSTRAINT IF EXISTS enrollment_codes_used_by_fkey;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE video_progress DROP CONSTRAINT IF EXISTS video_progress_user_id_fkey;
ALTER TABLE active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey;
ALTER TABLE video_access_logs DROP CONSTRAINT IF EXISTS video_access_logs_user_id_fkey;
ALTER TABLE locked_accounts DROP CONSTRAINT IF EXISTS locked_accounts_user_id_fkey;

-- ضمان وجود حقول الهاتف وكلمة المرور والاسم في profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
