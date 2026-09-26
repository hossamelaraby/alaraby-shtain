#!/bin/bash
# ==========================================================
# encrypt-video.sh
# تحويل فيديو خام إلى HLS مقسم (segments) ومشفر بـ AES-128
# كل فيديو بياخد مفتاح تشفير خاص بيه (unique key per video)
# ==========================================================
# الاستخدام:
#   ./encrypt-video.sh input.mp4 <video_id>
#
# المخرجات:
#   storage/encrypted/<video_id>/
#       ├── playlist.m3u8      (الـ manifest)
#       ├── segment_000.ts ...  (المقاطع المشفرة)
#       ├── key.bin            (مفتاح التشفير - يُخزّن بشكل آمن، ماينزلش على القرص إنتاج)
#       └── key_info.txt        (يستخدمه ffmpeg وقت التقطيع فقط)

set -e

INPUT_FILE="$1"
VIDEO_ID="$2"

if [ -z "$INPUT_FILE" ] || [ -z "$VIDEO_ID" ]; then
  echo "الاستخدام: ./encrypt-video.sh <input_file> <video_id>"
  exit 1
fi

OUT_DIR="../storage/encrypted/$VIDEO_ID"
mkdir -p "$OUT_DIR"

# 1) توليد مفتاح تشفير عشوائي 16 بايت (AES-128) خاص بهذا الفيديو فقط
openssl rand 16 > "$OUT_DIR/key.bin"

# 2) توليد IV عشوائي (Initialization Vector)
KEY_INFO_IV=$(openssl rand -hex 16)

# 3) ملف الـ key_info المطلوب لـ ffmpeg:
#    السطر الأول: الرابط اللي المشغّل (Player) هيطلب منه المفتاح وقت التشغيل
#    السطر الثاني: مسار المفتاح المحلي وقت التقطيع (يُحذف بعد الانتهاء)
#    السطر الثالث: الـ IV
cat > "$OUT_DIR/key_info.txt" <<EOF
https://your-domain.com/api/videos/$VIDEO_ID/key
$OUT_DIR/key.bin
$KEY_INFO_IV
EOF

# 4) التقطيع والتشفير الفعلي
#    - مدة كل segment: 4 ثواني (كل ما قلّت، كل ما صعّبت التحميل الكامل دفعة واحدة)
#    - h264 + aac للتوافق مع كل المتصفحات
ffmpeg -i "$INPUT_FILE" \
  -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 128k \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_key_info_file "$OUT_DIR/key_info.txt" \
  -hls_segment_filename "$OUT_DIR/segment_%03d.ts" \
  "$OUT_DIR/playlist.m3u8"

echo "✅ تم تشفير الفيديو: $VIDEO_ID"
echo "⚠️  انقل key.bin إلى نظام تخزين المفاتيح الآمن (مش نفس فولدر الفيديوهات) واحذفه من هنا بعد كده"
