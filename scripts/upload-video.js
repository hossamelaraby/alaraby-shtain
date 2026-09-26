/**
 * upload-video.js
 * بعد تشفير الفيديو محليًا بـ encrypt-video.sh، استخدم هذا السكريبت لرفعه
 * إلى Supabase Storage (bucket خاص) + رفع المفتاح لـ bucket منفصل تمامًا.
 *
 * الاستخدام:
 *   node upload-video.js <video_id> <local_encrypted_folder>
 *
 * قبل التشغيل:
 *   npm install @supabase/supabase-js
 *   export NEXT_PUBLIC_SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadVideo(videoId, folderPath) {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileBuffer = fs.readFileSync(filePath);

    if (file === 'key.bin') {
      // المفتاح يروح لـ bucket منفصل تمامًا: video-keys
      const { error } = await supabase.storage
        .from('video-keys')
        .upload(`${videoId}/key.bin`, fileBuffer, { upsert: true });
      if (error) console.error('❌ فشل رفع المفتاح:', error.message);
      else console.log('✅ تم رفع المفتاح إلى video-keys/' + videoId);
      continue;
    }

    if (file === 'key_info.txt') continue; // ملف مؤقت، مش محتاجينه بعد الرفع

    // باقي الملفات (playlist.m3u8 + segments) تروح لـ bucket: encrypted-videos
    const { error } = await supabase.storage
      .from('encrypted-videos')
      .upload(`${videoId}/${file}`, fileBuffer, { upsert: true });

    if (error) console.error(`❌ فشل رفع ${file}:`, error.message);
    else console.log(`✅ تم رفع ${file}`);
  }

  console.log('\n🎉 اكتمل الرفع. تأكد إن الـ bucket-ين "encrypted-videos" و"video-keys" مش Public من إعدادات Supabase.');
}

const [, , videoId, folderPath] = process.argv;
if (!videoId || !folderPath) {
  console.log('الاستخدام: node upload-video.js <video_id> <folder_path>');
  process.exit(1);
}

uploadVideo(videoId, folderPath);
